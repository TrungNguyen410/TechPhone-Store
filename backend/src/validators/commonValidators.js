const { param, query } = require('express-validator');

const idParam = [param('id').notEmpty().withMessage('id is required')];

const paginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
];

module.exports = { idParam, paginationQuery };
