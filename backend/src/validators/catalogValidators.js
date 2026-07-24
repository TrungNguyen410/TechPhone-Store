const { body, query } = require('express-validator');
const { paginationQuery } = require('./commonValidators');
const brandRepository = require('../repositories/brandRepository');
const categoryRepository = require('../repositories/categoryRepository');

const list = [
  ...paginationQuery,
  query('q').optional().trim(),
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('brand').optional().trim(),
  query('status').optional().isIn(['active', 'inactive']).withMessage('status is invalid'),
  query('sort').optional().isIn(['newest', 'price-asc', 'price-desc', 'best-selling', 'rating']).withMessage('sort is invalid'),
];
const activeExists = (repository, label) => async (value) => {
  const item = await repository.findById(value);
  if (!item || !item.active) throw new Error(`${label} is invalid or inactive`);
  return true;
};
const brandExists = activeExists(brandRepository, 'brandId');
const categoryExists = activeExists(categoryRepository, 'categoryId');
const catalogFields = ({ priceOptional = false } = {}) => [
  priceOptional
    ? body('price').optional().isFloat({ min: 0 }).withMessage('price must be positive')
    : body('price').isFloat({ min: 0 }).withMessage('price must be positive'),
  body('oldPrice').optional().isFloat({ min: 0 }).withMessage('oldPrice must be positive'),
  body('discountPercent').optional().isFloat({ min: 0 }).withMessage('discountPercent must be positive'),
  body('image').optional().isString(),
  body('images').optional().isArray().withMessage('images must be an array'),
  body('stock').optional().isInt({ min: 0 }).withMessage('stock must be positive'),
  body('sold').optional().isInt({ min: 0 }).withMessage('sold must be positive'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating must be between 0 and 5'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('status is invalid'),
];
const create = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('brandId').trim().notEmpty().withMessage('brandId is required').bail().custom(brandExists),
  body('categoryId').trim().notEmpty().withMessage('categoryId is required').bail().custom(categoryExists),
  ...catalogFields(),
];
const update = [
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('brandId').optional().trim().notEmpty().withMessage('brandId cannot be empty').bail().custom(brandExists),
  body('categoryId').optional().trim().notEmpty().withMessage('categoryId cannot be empty').bail().custom(categoryExists),
  ...catalogFields({ priceOptional: true }),
];

module.exports = { list, create, update };
