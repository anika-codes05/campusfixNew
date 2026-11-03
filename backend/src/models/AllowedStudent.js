const mongoose = require('mongoose');

// Roll numbers the college admin has approved. Only these can register.
const allowedStudentSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, trim: true, default: '' },
    registered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AllowedStudent', allowedStudentSchema);
