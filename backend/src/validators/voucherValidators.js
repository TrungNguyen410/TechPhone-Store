const { body } = require('express-validator');

const create = [
  body('code').trim().notEmpty().withMessage('code is required'),
  body('type').isIn(['percent', 'fixed', 'shipping']).withMessage('type is invalid'),
  body('value').isFloat({ min: 0 }).withMessage('value must be positive'),
  body('minOrder').optional().isFloat({ min: 0 }).withMessage('minOrder must be positive'),
  body('maxDiscount').optional().isFloat({ min: 0 }).withMessage('maxDiscount must be positive'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('quantity must be positive'),
  body('startDate').isISO8601().withMessage('startDate is invalid'),
  body('endDate').isISO8601().withMessage('endDate is invalid'),
  body('active').optional().isBoolean().withMessage('active must be boolean'),
];

const update = [
  body('code').optional().trim().notEmpty().withMessage('code cannot be empty'),
  body('type').optional().isIn(['percent', 'fixed', 'shipping']).withMessage('type is invalid'),
  body('value').optional().isFloat({ min: 0 }).withMessage('value must be positive'),
  body('minOrder').optional().isFloat({ min: 0 }).withMessage('minOrder must be positive'),
  body('maxDiscount').optional().isFloat({ min: 0 }).withMessage('maxDiscount must be positive'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('quantity must be positive'),
  body('startDate').optional().isISO8601().withMessage('startDate is invalid'),
  body('endDate').optional().isISO8601().withMessage('endDate is invalid'),
  body('active').optional().isBoolean().withMessage('active must be boolean'),
];

const check = [
  body('code').trim().notEmpty().withMessage('code is required'),
  body('subtotal').isFloat({ min: 0 }).withMessage('subtotal must be positive'),
];

module.exports = { create, update, check };
