const { body } = require('express-validator');

const create = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('slug').optional().trim(),
  body('description').optional().trim(),
  body('active').optional().isBoolean().withMessage('active must be boolean'),
];

const update = [
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('slug').optional().trim(),
  body('description').optional().trim(),
  body('active').optional().isBoolean().withMessage('active must be boolean'),
];

module.exports = { create, update };
