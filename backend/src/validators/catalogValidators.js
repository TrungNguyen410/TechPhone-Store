const { body, query } = require('express-validator');
const { paginationQuery } = require('./commonValidators');

const list = [
  ...paginationQuery,
  query('q').optional().trim(),
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('brand').optional().trim(),
  query('status').optional().isIn(['active', 'inactive']).withMessage('status is invalid'),
  query('sort')
    .optional()
    .isIn(['newest', 'price-asc', 'price-desc', 'best-selling', 'rating'])
    .withMessage('sort is invalid'),
];

const create = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('brand').trim().notEmpty().withMessage('brand is required'),
  body('category').trim().notEmpty().withMessage('category is required'),
  body('price').isFloat({ min: 0 }).withMessage('price must be positive'),
  body('oldPrice').optional().isFloat({ min: 0 }).withMessage('oldPrice must be positive'),
  body('discountPercent').optional().isFloat({ min: 0 }).withMessage('discountPercent must be positive'),
  body('image').optional().isString(),
  body('images').optional().isArray().withMessage('images must be an array'),
  body('stock').optional().isInt({ min: 0 }).withMessage('stock must be positive'),
  body('sold').optional().isInt({ min: 0 }).withMessage('sold must be positive'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating must be between 0 and 5'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('status is invalid'),
];

const update = [
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('brand').optional().trim().notEmpty().withMessage('brand cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('category cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('price must be positive'),
  body('oldPrice').optional().isFloat({ min: 0 }).withMessage('oldPrice must be positive'),
  body('discountPercent').optional().isFloat({ min: 0 }).withMessage('discountPercent must be positive'),
  body('image').optional().isString(),
  body('images').optional().isArray().withMessage('images must be an array'),
  body('stock').optional().isInt({ min: 0 }).withMessage('stock must be positive'),
  body('sold').optional().isInt({ min: 0 }).withMessage('sold must be positive'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating must be between 0 and 5'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('status is invalid'),
];

module.exports = { list, create, update };
