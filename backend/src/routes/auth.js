const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const AllowedStudent = require('../models/AllowedStudent');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

const ROLL_RE = /^[A-Za-z0-9]{4,20}$/;

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name, roll number and password are required.'),
  body('rollNumber')
    .trim()
    .notEmpty().withMessage('Name, roll number and password are required.')
    .bail()
    .matches(ROLL_RE).withMessage('Enter a valid roll number (letters and digits only).'),
  body('password')
    .notEmpty().withMessage('Name, roll number and password are required.')
    .bail()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

const loginValidators = [
  body('rollNumber').trim().notEmpty().withMessage('Roll number and password are required.'),
  body('password').notEmpty().withMessage('Roll number and password are required.'),
];

router.post('/register', registerValidators, validate, async (req, res) => {
  try {
    const { name, password } = req.body;
    const rollNumber = String(req.body.rollNumber).trim().toUpperCase();

    const allowed = await AllowedStudent.findOne({ rollNumber });
    if (!allowed) {
      return res
        .status(403)
        .json({ message: 'Roll number not found. Contact your college admin.' });
    }
    const existing = await User.findOne({ rollNumber });
    if (existing) {
      return res.status(409).json({ message: 'An account with this roll number already exists.' });
    }
    const user = await User.create({ name, rollNumber, password, role: 'student' });
    allowed.registered = true;
    await allowed.save();
    const token = signToken(user);
    return res.status(201).json({ ...user.toSafeJSON(), token });
  } catch (err) {
    return res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

router.post('/login', loginValidators, validate, async (req, res) => {
  try {
    const { password } = req.body;
    const rollNumber = String(req.body.rollNumber).trim().toUpperCase();
    const user = await User.findOne({ rollNumber });
    if (!user) {
      return res.status(401).json({ message: 'Invalid roll number or password.' });
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid roll number or password.' });
    }
    const token = signToken(user);
    return res.json({ ...user.toSafeJSON(), token });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

router.get('/me', auth, (req, res) => {
  return res.json(req.user.toSafeJSON());
});

module.exports = router;
