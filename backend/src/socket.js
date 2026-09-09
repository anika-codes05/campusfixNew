const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth && socket.handshake.auth.token)
        || (socket.handshake.query && socket.handshake.query.token);
      if (!token) return next(new Error('Not authenticated.'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user) return next(new Error('User no longer exists.'));
      socket.user = user;
      socket.join(`user:${user._id}`);
      next();
    } catch (err) {
      next(new Error('Invalid token.'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.email}`);
  });

  return io;
}

function emitIssueNew(issue) {
  if (io) io.emit('issue:new', issue);
}

function emitIssueUpdated(issue) {
  if (io) io.emit('issue:updated', issue);
}

function emitIssueDeleted(issueId) {
  if (io) io.emit('issue:deleted', String(issueId));
}

function emitNotification(notification, userId) {
  if (io) io.to(`user:${userId}`).emit('notification:new', notification);
}

module.exports = { initSocket, emitIssueNew, emitIssueUpdated, emitIssueDeleted, emitNotification };