const { body } = require('express-validator');

const create = [
  body('key').trim().notEmpty().withMessage('key is required'),
  body('value').exists().withMessage('value is required'),
  body('group').optional().trim(),
  body('label').optional().trim(),
];

const update = [
  body('value').optional().exists().withMessage('value is required'),
  body('group').optional().trim(),
  body('label').optional().trim(),
];

module.exports = { create, update };
