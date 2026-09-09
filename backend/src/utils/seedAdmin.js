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
  const email = (process.env.ADMIN_EMAIL || 'admin@kiet.edu').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'changeme123';
  const team = process.env.ADMIN_TEAM || 'general';

  try {
    await mongoose.connect(uri);
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`Admin already exists for ${email}. Updating role to admin.`);
      existing.role = 'admin';
      existing.team = team;
      await existing.save();
    } else {
      await User.create({ name, email, password, role: 'admin', team });
      console.log(`Created admin: ${email}`);
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
