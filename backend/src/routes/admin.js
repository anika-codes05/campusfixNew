const router = require('express').Router();
const mongoose = require('mongoose');
const { query } = require('express-validator');
const Issue = require('../models/Issue');
const User = require('../models/User');
const AllowedStudent = require('../models/AllowedStudent');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const validate = require('../middleware/validate');
const { CATEGORIES } = require('../models/Issue');

// GET /api/admin/stats
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const all = await Issue.find().select('status category').lean();
    const countBy = (status) => all.filter((i) => i.status === status).length;
    const open = countBy('reported');
    const inProgress = countBy('in_progress');
    const resolved = countBy('resolved');

    const byCategory = {};
    for (const c of CATEGORIES) {
      const bucket = all.filter((i) => i.category === c);
      byCategory[c] = {
        open: bucket.filter((i) => i.status === 'reported').length,
        inProgress: bucket.filter((i) => i.status === 'in_progress').length,
        resolved: bucket.filter((i) => i.status === 'resolved').length,
        total: bucket.length,
      };
    }

    return res.json({ open, inProgress, resolved, total: all.length, byCategory });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load stats.', error: err.message });
  }
});

// GET /api/admin/trends?days=14 — issues per day
router.get('/trends', auth, adminOnly, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 14, 90);
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const issues = await Issue.find({ createdAt: { $gte: since } }).select('createdAt').lean();
    const counts = {};
    const labels = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      labels.push(key);
      counts[key] = 0;
    }
    issues.forEach((i) => {
      const key = new Date(i.createdAt).toISOString().slice(0, 10);
      if (counts[key] !== undefined) counts[key] += 1;
    });

    return res.json({ labels, counts });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load trends.', error: err.message });
  }
});

// GET /api/admin/overdue?days=3 — issues stuck in reported for N days
router.get('/overdue', auth, adminOnly, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 3;
    const olderThan = new Date();
    olderThan.setDate(olderThan.getDate() - days);

    const issues = await Issue.find({
      status: { $in: ['reported', 'in_progress'] },
      createdAt: { $lte: olderThan },
    })
      .populate('reportedBy', 'name rollNumber')
      .populate('assignedTo', 'name team')
      .sort({ createdAt: 1 });

    return res.json(issues.map((i) => ({
      _id: i._id,
      title: i.title,
      category: i.category,
      status: i.status,
      priority: i.priority,
      location: i.location,
      upvoteCount: i.upvotes.length,
      createdAt: i.createdAt,
      daysOld: Math.floor((Date.now() - new Date(i.createdAt).getTime()) / 86400000),
      assignedTo: i.assignedTo,
    })));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load overdue.', error: err.message });
  }
});

// GET /api/admin/issues — full listing for the management table (paginated)
router.get('/issues', [
  query('page').optional().toInt().isInt({ min: 1 }).withMessage('Invalid page.'),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }).withMessage('Invalid limit.'),
], validate, auth, adminOnly, async (req, res) => {
  try {
    const { category, status, priority, search, sort, block } = req.query;
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (block) query['location.blockName'] = block;
    if (search) {
      query.$text = { $search: search };
    }

    const sortOpts = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    let issues;
    let total;
    if (sort === 'upvotes') {
      issues = await Issue.find(query)
        .populate('reportedBy', 'name rollNumber')
        .populate('assignedTo', 'name team');
      total = issues.length;
      issues.sort((a, b) => b.upvotes.length - a.upvotes.length || new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      total = await Issue.countDocuments(query);
      issues = await Issue.find(query)
        .populate('reportedBy', 'name rollNumber')
        .populate('assignedTo', 'name team')
        .sort(sortOpts)
        .skip((page - 1) * limit)
        .limit(limit);
    }

    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const start = (page - 1) * limit;
    const paged = sort === 'upvotes' ? issues.slice(start, start + limit) : issues;

    return res.json({
      issues: paged.map((i) => ({
        _id: i._id,
        title: i.title,
        description: i.description,
        category: i.category,
        affectedCount: i.affectedCount || 1,
        status: i.status,
        priority: i.priority,
        location: i.location,
        photoUrl: i.photoUrl,
        reportedBy: i.reportedBy,
        upvoteCount: i.upvotes.length,
        assignedTo: i.assignedTo,
        resolvedAt: i.resolvedAt,
        createdAt: i.createdAt,
      })),
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load issues.', error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json(users.map((u) => u.toSafeJSON()));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load users.', error: err.message });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!['student', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.role = role;
    await user.save();
    return res.json(user.toSafeJSON());
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update role.', error: err.message });
  }
});

// PATCH /api/admin/users/:id/team
router.patch('/users/:id/team', auth, adminOnly, async (req, res) => {
  try {
    const { team } = req.body || {};
    const allowed = ['electrical', 'plumbing', 'mess', 'infrastructure', 'other', 'general'];
    if (!allowed.includes(team)) {
      return res.status(400).json({ message: 'Invalid team.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.team = team;
    await user.save();
    return res.json(user.toSafeJSON());
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update team.', error: err.message });
  }
});

// POST /api/admin/export — CSV download (admin only)
router.get('/export', auth, adminOnly, async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate('reportedBy', 'name rollNumber')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 });

    const escape = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const headers = [
      'id', 'title', 'description', 'category', 'affectedCount', 'status', 'priority',
      'block', 'floorRoom', 'lat', 'lng', 'upvotes', 'reportedBy',
      'assignedTo', 'reportedAt', 'resolvedAt', 'createdAt',
    ];
    const rows = issues.map((i) => [
      i._id, i.title, i.description, i.category, i.affectedCount || 1, i.status, i.priority,
      i.location.blockName, i.location.floorRoom, i.location.lat, i.location.lng,
      i.upvotes.length,
      i.reportedBy.map((r) => r.rollNumber).join('; '),
      i.assignedTo ? i.assignedTo.name : '',
      new Date(i.createdAt).toISOString(),
      i.resolvedAt ? new Date(i.resolvedAt).toISOString() : '',
      new Date(i.createdAt).toISOString(),
    ]);

    const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="campusfix-export.csv"');
    return res.status(200).send(`\uFEFF` + csv);
  } catch (err) {
    return res.status(500).json({ message: 'Export failed.', error: err.message });
  }
});

// ---- Allowed students (roll number whitelist) ----

// GET /api/admin/students
router.get('/students', auth, adminOnly, async (req, res) => {
  try {
    const students = await AllowedStudent.find().sort({ rollNumber: 1 }).lean();
    return res.json(students);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load students.', error: err.message });
  }
});

// POST /api/admin/students/upload  body: { rollNumbers: ['2300290100001', ...] }
router.post('/students/upload', auth, adminOnly, async (req, res) => {
  try {
    const list = Array.isArray(req.body.rollNumbers) ? req.body.rollNumbers : [];
    const clean = [...new Set(
      list.map((r) => String(r).trim().toUpperCase()).filter((r) => /^[A-Z0-9]{4,20}$/.test(r))
    )];
    if (clean.length === 0) {
      return res.status(400).json({ message: 'No valid roll numbers found in the file.' });
    }
    const result = await AllowedStudent.bulkWrite(
      clean.map((rollNumber) => ({
        updateOne: { filter: { rollNumber }, update: { $setOnInsert: { rollNumber } }, upsert: true },
      }))
    );
    return res.json({ received: clean.length, added: result.upsertedCount });
  } catch (err) {
    return res.status(500).json({ message: 'Upload failed.', error: err.message });
  }
});

// DELETE /api/admin/students/:id
router.delete('/students/:id', auth, adminOnly, async (req, res) => {
  try {
    await AllowedStudent.findByIdAndDelete(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Delete failed.', error: err.message });
  }
});

module.exports = router;
