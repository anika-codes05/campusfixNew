require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedAdmin() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  const name = process.env.ADMIN_NAME || 'Campus Admin';
  const rollNumber = (process.env.ADMIN_ROLL || 'ADMIN001').toUpperCase();
  const password = process.env.ADMIN_PASSWORD || 'changeme123';
  const team = process.env.ADMIN_TEAM || 'general';

  try {
    await mongoose.connect(uri);
    const existing = await User.findOne({ rollNumber });
    if (existing) {
      console.log(`Admin already exists for ${rollNumber}. Updating role to admin.`);
      existing.role = 'admin';
      existing.team = team;
      await existing.save();
    } else {
      await User.create({ name, rollNumber, password, role: 'admin', team });
      console.log(`Created admin: ${rollNumber}`);
    }
    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();
