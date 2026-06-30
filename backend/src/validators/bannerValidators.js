const { body } = require('express-validator');

const create = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('description').optional().trim(),
  body('image').trim().notEmpty().withMessage('image is required'),
  body('link').optional().trim(),
  body('position').optional().isInt({ min: 0 }).withMessage('position must be positive'),
  body('active').optional().isBoolean().withMessage('active must be boolean'),
];

const update = [
  body('title').optional().trim().notEmpty().withMessage('title cannot be empty'),
  body('description').optional().trim(),
  body('image').optional().trim().notEmpty().withMessage('image cannot be empty'),
  body('link').optional().trim(),
  body('position').optional().isInt({ min: 0 }).withMessage('position must be positive'),
  body('active').optional().isBoolean().withMessage('active must be boolean'),
];

module.exports = { create, update };
