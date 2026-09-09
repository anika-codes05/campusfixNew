const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name, email and password are required.'),
  body('email').trim().isEmail().withMessage('Name, email and password are required.'),
  body('password')
    .notEmpty().withMessage('Name, email and password are required.')
    .bail()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('Email and password are required.'),
  body('password').notEmpty().withMessage('Email and password are required.'),
];

router.post('/register', registerValidators, validate, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const user = await User.create({ name, email, password, role: 'student' });
    const token = signToken(user);
    return res.status(201).json({ ...user.toSafeJSON(), token });
  } catch (err) {
    return res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

router.post('/login', loginValidators, validate, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password.' });
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
