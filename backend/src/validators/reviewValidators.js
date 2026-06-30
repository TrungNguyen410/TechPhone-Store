const { body, param } = require('express-validator');

const create = [
  body('productId').optional().trim().notEmpty().withMessage('productId cannot be empty'),
  body('accessoryId').optional({ nullable: true }).trim().notEmpty().withMessage('accessoryId cannot be empty'),
  body('userName').optional().trim().notEmpty().withMessage('userName cannot be empty'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be 1 through 5'),
  body('comment').trim().isLength({ min: 10 }).withMessage('comment must be at least 10 characters'),
  body('images').optional().isArray({ max: 5 }).withMessage('images must be an array with at most 5 items'),
  body('images.*').optional().isURL({ require_tld: false }).withMessage('review image must be a valid URL'),
];

const update = [
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('rating must be 1 through 5'),
  body('comment').optional().trim().isLength({ min: 10 }).withMessage('comment must be at least 10 characters'),
  body('images').optional().isArray({ max: 5 }).withMessage('images must be an array with at most 5 items'),
  body('images.*').optional().isURL({ require_tld: false }).withMessage('review image must be a valid URL'),
  body('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('status is invalid'),
];

const productId = [param('productId').trim().notEmpty().withMessage('productId is required')];
const accessoryId = [param('accessoryId').trim().notEmpty().withMessage('accessoryId is required')];

module.exports = { create, update, productId, accessoryId };
