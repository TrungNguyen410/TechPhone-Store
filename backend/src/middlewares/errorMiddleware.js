const AppError = require('../utils/AppError');
const { errorResponse } = require('../utils/apiResponse');

const notFound = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || (error.name === 'ValidationError' ? 422 : 500);
  const message = error.message || 'Internal server error';
  const errors =
    error.errors && typeof error.errors === 'object'
      ? Object.values(error.errors).map((item) => item.message || item)
      : error.errors;

  if (process.env.NODE_ENV !== 'test') {
    console.error(error);
  }

  errorResponse(res, message, statusCode, errors);
};

module.exports = { notFound, errorHandler };
