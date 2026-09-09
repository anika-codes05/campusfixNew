const mongoose = require('mongoose');

const CATEGORIES = ['electrical', 'plumbing', 'mess', 'infrastructure', 'other'];
const STATUSES = ['reported', 'in_progress', 'resolved'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const timelineEntrySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    category: { type: String, enum: CATEGORIES, required: true },
    affectedCount: { type: Number, default: 1, min: 1 },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      blockName: { type: String, required: true, trim: true },
      floorRoom: { type: String, default: '' },
    },
    photoUrl: { type: String, default: null },
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: STATUSES, default: 'reported' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    priorityManuallySet: { type: Boolean, default: false },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    timeline: [timelineEntrySchema],
    adminNotes: [{ type: String }],
    comments: [commentSchema],
    resolvedConfirmations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

issueSchema.virtual('upvoteCount').get(function () {
  return this.upvotes.length;
});

issueSchema.index({ title: 'text', description: 'text' });

const PRIORITY_ORDER = { low: 0, medium: 1, high: 2, urgent: 3 };

issueSchema.statics.priorityForAffected = function (count) {
  const n = Number(count) || 1;
  if (n <= 2) return 'low';
  if (n <= 5) return 'medium';
  if (n <= 20) return 'high';
  return 'urgent';
};

issueSchema.statics.escalateFromUpvotes = function (issue) {
  if (issue.priorityManuallySet) return;
  const n = issue.upvotes ? issue.upvotes.length : 0;
  const tier = n >= 10 ? 'urgent' : n >= 5 ? 'high' : null;
  if (tier && (PRIORITY_ORDER[tier] || 0) > (PRIORITY_ORDER[issue.priority] || 0)) {
    issue.priority = tier;
  }
};

issueSchema.statics.HAVERSINE_RADIUS_M = 50;

module.exports = mongoose.model('Issue', issueSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.STATUSES = STATUSES;
module.exports.PRIORITIES = PRIORITIES;
