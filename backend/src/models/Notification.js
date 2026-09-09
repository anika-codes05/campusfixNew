const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
    type: {
      type: String,
      enum: ['status_change', 'assigned', 'comment', 'priority', 'upvote'],
      default: 'status_change',
    },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
