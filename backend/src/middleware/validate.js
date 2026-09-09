const { validationResult } = require('express-validator');

module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const first = errors.array({ onlyFirstError: true })[0];
  return res.status(400).json({ message: first.msg });
};