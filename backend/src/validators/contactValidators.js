const { body } = require('express-validator');

const create = [
  body('fullName').trim().notEmpty().withMessage('fullName is required'),
  body('email').isEmail().normalizeEmail().withMessage('valid email is required'),
  body('phone').trim().isLength({ min: 9, max: 15 }).withMessage('valid phone is required'),
  body('subject').trim().notEmpty().withMessage('subject is required'),
  body('message').trim().isLength({ min: 10 }).withMessage('message must be at least 10 characters'),
];

const update = [
  body('status').optional().isIn(['new', 'read', 'resolved']).withMessage('status is invalid'),
  body('adminNote').optional().trim(),
];

module.exports = { create, update };
