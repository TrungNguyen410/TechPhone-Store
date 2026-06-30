const { body } = require('express-validator');

const update = [
  body('fullName').optional().trim().notEmpty().withMessage('fullName cannot be empty'),
  body('phone').optional().trim().isLength({ min: 9, max: 15 }).withMessage('valid phone is required'),
  body('address').optional().trim(),
  body('status').optional().isIn(['active', 'locked', 'inactive']).withMessage('status is invalid'),
];

module.exports = { update };
