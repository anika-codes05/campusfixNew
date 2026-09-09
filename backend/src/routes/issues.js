const router = require('express').Router();
const mongoose = require('mongoose');
const { body, param, query } = require('express-validator');
const Issue = require('../models/Issue');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const upload = require('../middleware/upload');
const compressPhoto = require('../middleware/compress');
const validate = require('../middleware/validate');
const { emitIssueNew, emitIssueUpdated, emitIssueDeleted, emitNotification } = require('../socket');
const { haversineDistanceMeters } = require('../utils/haversine');

const POPULATE = [
  { path: 'reportedBy', select: 'name email role' },
  { path: 'assignedTo', select: 'name email role team' },
  { path: 'timeline.by', select: 'name role' },
  { path: 'comments.user', select: 'name role' },
];

const validIssueId = param('id').isMongoId().withMessage('Issue not found.');

const issueCreateValidators = [
  body('title').trim()
    .if((value, { req }) => !req.body.joinExistingId)
    .notEmpty().withMessage('All required fields must be provided.'),
  body('description').trim()
    .if((value, { req }) => !req.body.joinExistingId)
    .notEmpty().withMessage('All required fields must be provided.'),
  body('category')
    .if((value, { req }) => !req.body.joinExistingId)
    .isIn(Issue.CATEGORIES).withMessage('All required fields must be provided.'),
  body('lat').toFloat()
    .if((value, { req }) => !req.body.joinExistingId)
    .isFloat({ min: -90, max: 90 }).withMessage('All required fields must be provided.'),
  body('lng').toFloat()
    .if((value, { req }) => !req.body.joinExistingId)
    .isFloat({ min: -180, max: 180 }).withMessage('All required fields must be provided.'),
  body('blockName').trim()
    .if((value, { req }) => !req.body.joinExistingId)
    .notEmpty().withMessage('All required fields must be provided.'),
  body('affectedCount').optional().toInt().isInt({ min: 1 }).withMessage('Affected count must be a positive number.'),
  body('joinExistingId').optional().isMongoId().withMessage('Invalid issue reference.'),
];

const duplicateCheckValidators = [
  body('lat').toFloat().isFloat({ min: -90, max: 90 }).withMessage('lat, lng and category are required.'),
  body('lng').toFloat().isFloat({ min: -180, max: 180 }).withMessage('lat, lng and category are required.'),
  body('category').isIn(Issue.CATEGORIES).withMessage('lat, lng and category are required.'),
];

const commentValidators = [
  validIssueId,
  body('text').trim().notEmpty().withMessage('Comment text is required.'),
];

const statusValidators = [
  validIssueId,
  body('status').isIn(Issue.STATUSES).withMessage('Invalid status value.'),
];

const priorityValidators = [
  validIssueId,
  body('priority').isIn(Issue.PRIORITIES).withMessage('Invalid priority value.'),
];

const assignValidators = [
  validIssueId,
  body('assignedTo').optional({ values: 'null' }).isMongoId().withMessage('Invalid assignee.'),
];

const noteValidators = [
  validIssueId,
  body('note').trim().notEmpty().withMessage('Note is required.'),
];

const listValidators = [
  query('page').optional().toInt().isInt({ min: 1 }).withMessage('Invalid page.'),
  query('limit').optional().toInt().isInt({ min: 1, max: 50 }).withMessage('Invalid limit.'),
];

function toFeedJSON(issue) {
  return {
    _id: issue._id,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    affectedCount: issue.affectedCount || 1,
    location: issue.location,
    photoUrl: issue.photoUrl,
    reportedBy: issue.reportedBy,
    upvoteCount: issue.upvotes.length,
    upvotedByMe: false,
    status: issue.status,
    priority: issue.priority,
    assignedTo: issue.assignedTo,
    timeline: issue.timeline,
    adminNotes: issue.adminNotes,
    comments: issue.comments,
    resolvedConfirmations: issue.resolvedConfirmations,
    resolvedAt: issue.resolvedAt,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}

function attachFlags(issues, userId) {
  const id = String(userId || '');
  return issues.map((i) => ({
    ...toFeedJSON(i),
    upvotedByMe: i.upvotes.some((u) => String(u._id || u) === id),
    confirmedByMe: i.resolvedConfirmations.some((u) => String(u._id || u) === id),
  }));
}

async function notifyUsers(issue, userIds, type, text) {
  const list = userIds instanceof Set ? [...userIds] : userIds;
  const unique = [...new Set(list.map(String))];
  if (!unique.length) return;
  const docs = unique.map((u) => ({ user: u, issue: issue._id, type, text }));
  const created = await Notification.insertMany(docs);
  created.forEach((n) => {
    emitNotification({
      _id: n._id,
      issue: { _id: issue._id, title: issue.title, status: issue.status },
      type: n.type,
      text: n.text,
      read: false,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }, String(n.user));
  });
}

function issueParticipants(issue) {
  const set = new Set([
    ...issue.reportedBy.map((u) => String(u._id || u)),
    ...issue.upvotes.map((u) => String(u._id || u)),
  ]);
  if (issue.assignedTo) set.add(String(issue.assignedTo._id || issue.assignedTo));
  return set;
}

// GET /api/issues — list, filterable/sortable, paginated
router.get('/', listValidators, validate, async (req, res) => {
  try {
    const { category, status, priority, sort, search, block } = req.query;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (search) {
      query.$text = { $search: search };
    }
    if (block) query['location.blockName'] = block;

    let sortOpts = { createdAt: -1 };
    if (sort === 'oldest') sortOpts = { createdAt: 1 };

    if (sort === 'upvotes' || sort === 'priority') {
      const all = await Issue.find(query).populate(POPULATE);
      const ranked = [...all];
      if (sort === 'upvotes') {
        ranked.sort((a, b) => b.upvotes.length - a.upvotes.length || new Date(b.createdAt) - new Date(a.createdAt));
      } else {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        ranked.sort(
          (a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2) || new Date(b.createdAt) - new Date(a.createdAt)
        );
      }
      const total = ranked.length;
      const totalPages = Math.max(Math.ceil(total / limit), 1);
      const start = (page - 1) * limit;
      return res.json({
        issues: attachFlags(ranked.slice(start, start + limit), req.user?._id),
        pagination: { page, limit, total, totalPages },
      });
    }

    const total = await Issue.countDocuments(query);
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const issues = await Issue.find(query)
      .populate(POPULATE)
      .sort(sortOpts)
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      issues: attachFlags(issues, req.user?._id),
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load issues.', error: err.message });
  }
});

// GET /api/issues/my-reports
router.get('/my-reports', auth, async (req, res) => {
  try {
    const id = req.user._id;
    const issues = await Issue.find({
      $or: [{ reportedBy: id }, { upvotes: id }],
    }).populate(POPULATE).sort({ createdAt: -1 });
    return res.json(attachFlags(issues, id));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load reports.', error: err.message });
  }
});

// GET /api/issues/:id
router.get('/:id', [validIssueId], validate, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Issue not found.' });
    }
    const issue = await Issue.findById(req.params.id).populate(POPULATE);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });
    return res.json(attachFlags([issue], req.user?._id)[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load issue.', error: err.message });
  }
});

// POST /api/issues — create (multipart)
router.post('/', auth, upload.single('photo'), compressPhoto, issueCreateValidators, validate, async (req, res) => {
  try {
    const {
      title, description, category, lat, lng, blockName, floorRoom, joinExistingId, affectedCount,
    } = req.body;

    if (joinExistingId && mongoose.isValidObjectId(joinExistingId)) {
      const existing = await Issue.findById(joinExistingId).populate(POPULATE);
      if (!existing) {
        return res.status(404).json({ message: 'The issue you tried to join no longer exists.' });
      }
      if (!existing.upvotes.includes(req.user._id)) {
        existing.upvotes.push(req.user._id);
        Issue.escalateFromUpvotes(existing);
        await existing.save();
        const reporters = existing.reportedBy
          .map((u) => String(u._id || u))
          .filter((uid) => uid !== String(req.user._id));
        await notifyUsers(
          existing,
          reporters,
          'upvote',
          `${req.user.name} joined your report of "${existing.title}".`
        );
      }
      const [flagged] = attachFlags([existing], req.user._id);
      emitIssueUpdated(toFeedJSON(existing));
      return res.status(200).json({ joinedExisting: true, issue: flagged });
    }

    if (!title || !description || !category || lat === undefined || lng === undefined || !blockName) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    const count = Number(affectedCount);
    const hasCount = Number.isFinite(count) && count >= 1;

    const issue = await Issue.create({
      title,
      description,
      category,
      affectedCount: hasCount ? count : 1,
      location: {
        lat: Number(lat),
        lng: Number(lng),
        blockName,
        floorRoom: floorRoom || '',
      },
      photoUrl: req.file ? `/uploads/${req.file.filename}` : null,
      reportedBy: [req.user._id],
      upvotes: [req.user._id],
      status: 'reported',
      priority: hasCount ? Issue.priorityForAffected(count) : 'medium',
      timeline: [{ status: 'reported', by: req.user._id, note: 'Issue reported' }],
    });

    const populated = await Issue.findById(issue._id).populate(POPULATE);
    emitIssueNew(toFeedJSON(populated));
    return res.status(201).json({ joinedExisting: false, issue: attachFlags([populated], req.user._id)[0] });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create issue.', error: err.message });
  }
});

// POST /api/issues/check-duplicate — Haversine within 50m
router.post('/check-duplicate', duplicateCheckValidators, validate, async (req, res) => {
  try {
    const { lat, lng, category } = req.body || {};
    if (lat === undefined || lng === undefined || !category) {
      return res.status(400).json({ message: 'lat, lng and category are required.' });
    }
    const candidates = await Issue.find({
      category,
      status: { $ne: 'resolved' },
    });
    const matches = candidates
      .filter((i) => haversineDistanceMeters(Number(lat), Number(lng), i.location.lat, i.location.lng) <= 50)
      .map((i) => ({
        _id: i._id,
        title: i.title,
        category: i.category,
        blockName: i.location.blockName,
        upvoteCount: i.upvotes.length,
        status: i.status,
      }))
      .sort((a, b) => b.upvoteCount - a.upvoteCount);
    return res.json({ hasDuplicates: matches.length > 0, matches });
  } catch (err) {
    return res.status(500).json({ message: 'Duplicate check failed.', error: err.message });
  }
});

// POST /api/issues/:id/upvote — two-way toggle
router.post('/:id/upvote', auth, [validIssueId], validate, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Issue not found.' });
    }
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    const idx = issue.upvotes.findIndex((u) => String(u) === String(req.user._id));
    let upvoted;
    if (idx >= 0) {
      issue.upvotes.splice(idx, 1);
      upvoted = false;
    } else {
      issue.upvotes.push(req.user._id);
      upvoted = true;
      Issue.escalateFromUpvotes(issue);
    }
    await issue.save();
    const populated = await Issue.findById(issue._id).populate(POPULATE);
    emitIssueUpdated(toFeedJSON(populated));
    return res.json({ upvoteCount: issue.upvotes.length, upvoted });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update upvote.', error: err.message });
  }
});

// POST /api/issues/:id/comments
router.post('/:id/comments', auth, commentValidators, validate, async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }
    const issue = await Issue.findById(req.params.id).populate(POPULATE);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    issue.comments.push({ user: req.user._id, text: text.trim() });
    await issue.save();

    const updated = await Issue.findById(issue._id).populate(POPULATE);
    emitIssueUpdated(toFeedJSON(updated));
    return res.json(attachFlags([updated], req.user._id)[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to add comment.', error: err.message });
  }
});

// POST /api/issues/:id/subscribe — follow for notifications
router.post('/:id/subscribe', auth, [validIssueId], validate, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });
    return res.json({ message: 'Subscribed.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to subscribe.', error: err.message });
  }
});

// POST /api/issues/:id/confirm-resolved — only reporters/upvoters, may trigger reopen decision
router.post('/:id/confirm-resolved', auth, [validIssueId], validate, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id).populate(POPULATE);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    const participants = issueParticipants(issue);
    if (!participants.has(String(req.user._id))) {
      return res.status(403).json({ message: 'Only issue participants can confirm resolution.' });
    }

    if (!issue.resolvedConfirmations.includes(req.user._id)) {
      issue.resolvedConfirmations.push(req.user._id);
      await issue.save();
    }
    const [flagged] = attachFlags([issue], req.user._id);
    emitIssueUpdated(toFeedJSON(issue));
    return res.json(flagged);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to confirm.', error: err.message });
  }
});

// POST /api/issues/:id/reopen — admin
router.post('/:id/reopen', auth, adminOnly, [validIssueId], validate, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });
    issue.status = 'reported';
    issue.resolvedAt = null;
    issue.timeline.push({ status: 'reported', by: req.user._id, note: 'Issue reopened' });
    await issue.save();
    await notifyUsers(issue, issueParticipants(issue), 'status_change',
      `Issue "${issue.title}" was reopened.`);

    const populated = await Issue.findById(issue._id).populate(POPULATE);
    emitIssueUpdated(toFeedJSON(populated));
    return res.json(attachFlags([populated], req.user._id)[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to reopen.', error: err.message });
  }
});

// PATCH /api/issues/:id/status — admin only
router.patch('/:id/status', auth, adminOnly, statusValidators, validate, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['reported', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    if (issue.status !== status) {
      issue.status = status;
      issue.resolvedAt = status === 'resolved' ? new Date() : null;
      issue.timeline.push({ status, by: req.user._id, note: 'Status updated' });
      await issue.save();
      await notifyUsers(issue, issueParticipants(issue), 'status_change',
        `Issue "${issue.title}" is now ${status.replace('_', ' ')}.`);
    }

    const populated = await Issue.findById(issue._id).populate(POPULATE);
    emitIssueUpdated(toFeedJSON(populated));
    return res.json(attachFlags([populated], req.user._id)[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update status.', error: err.message });
  }
});

// PATCH /api/issues/:id/priority — admin only
router.patch('/:id/priority', auth, adminOnly, priorityValidators, validate, async (req, res) => {
  try {
    const { priority } = req.body || {};
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority value.' });
    }
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });
    issue.priority = priority;
    issue.priorityManuallySet = true;
    await issue.save();
    await notifyUsers(issue, issueParticipants(issue), 'priority',
      `Priority of "${issue.title}" changed to ${priority}.`);

    const populated = await Issue.findById(issue._id).populate(POPULATE);
    emitIssueUpdated(toFeedJSON(populated));
    return res.json(attachFlags([populated], req.user._id)[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update priority.', error: err.message });
  }
});

// PATCH /api/issues/:id/assign — admin only
router.patch('/:id/assign', auth, adminOnly, assignValidators, validate, async (req, res) => {
  try {
    const { assignedTo } = req.body || {};
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    if (assignedTo && !mongoose.isValidObjectId(assignedTo)) {
      return res.status(400).json({ message: 'Invalid assignee.' });
    }
    issue.assignedTo = assignedTo || null;
    await issue.save();

    if (assignedTo) {
      await notifyUsers(issue, [assignedTo], 'assigned',
        `You were assigned to issue "${issue.title}".`);
    }

    const populated = await Issue.findById(issue._id).populate(POPULATE);
    emitIssueUpdated(toFeedJSON(populated));
    return res.json(attachFlags([populated], req.user._id)[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to assign.', error: err.message });
  }
});

// POST /api/issues/:id/notes — admin only
router.post('/:id/notes', auth, adminOnly, noteValidators, validate, async (req, res) => {
  try {
    const { note } = req.body || {};
    if (!note || !note.trim()) {
      return res.status(400).json({ message: 'Note is required.' });
    }
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });
    issue.adminNotes.push(note.trim());
    await issue.save();
    const populated = await Issue.findById(issue._id).populate(POPULATE);
    emitIssueUpdated(toFeedJSON(populated));
    return res.json(attachFlags([populated], req.user._id)[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to add note.', error: err.message });
  }
});

// DELETE /api/issues/:id — admin or original reporter
router.delete('/:id', auth, [validIssueId], validate, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Issue not found.' });
    }
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    const isReporter = issue.reportedBy.some((u) => String(u) === String(req.user._id));
    const isAdmin = req.user.role === 'admin';
    if (!isReporter && !isAdmin) {
      return res.status(403).json({ message: 'You are not allowed to delete this issue.' });
    }
    await issue.deleteOne();
    await Notification.deleteMany({ issue: issue._id });
    emitIssueDeleted(issue._id);
    return res.json({ message: 'Issue deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete issue.', error: err.message });
  }
});

module.exports = router;
