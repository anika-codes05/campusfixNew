require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const Issue = require('./models/Issue');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Copy backend/.env.example to backend/.env and fill it in.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy backend/.env.example to backend/.env.');
  process.exit(1);
}

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');
    try {
      await Issue.ensureIndexes();
      console.log('MongoDB indexes ensured.');
    } catch (err) {
      console.warn('Failed to ensure indexes:', err.message);
    }

    const server = http.createServer(app);
    initSocket(server);
    server.listen(PORT, () => {
      console.log(`CampusFix backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

start();
