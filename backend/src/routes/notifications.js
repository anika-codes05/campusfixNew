const router = require('express').Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// GET /api/notifications
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('issue', 'title status')
      .sort({ createdAt: -1 })
      .limit(100);
    const unread = notifications.filter((n) => !n.read).length;
    return res.json({ notifications, unread });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load notifications.', error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: 'Notification not found.' });
    return res.json(n);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update notification.', error: err.message });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    return res.json({ message: 'All notifications marked read.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update notifications.', error: err.message });
  }
});

module.exports = router;
