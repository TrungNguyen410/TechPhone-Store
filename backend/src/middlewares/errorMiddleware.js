const AppError = require('../utils/AppError');
const { errorResponse } = require('../utils/apiResponse');

const notFound = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

const errorHandler = (error, _req, res, _next) => {
  const isUploadLimit = error.code === 'LIMIT_FILE_SIZE';
  const isJwtError = ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name);
  const statusCode =
    error.statusCode
    || (isJwtError ? 401 : error.name === 'ValidationError' || isUploadLimit ? 422 : 500);
  const hideUnexpectedError =
    process.env.NODE_ENV === 'production'
    && statusCode >= 500
    && !(error instanceof AppError);
  const message = hideUnexpectedError
    ? 'Internal server error'
    : isJwtError
      ? 'Authentication token is invalid or expired'
      : isUploadLimit
        ? 'Image must not exceed 5MB'
        : error.message || 'Internal server error';
  const errors =
    error.errors && typeof error.errors === 'object'
      ? Object.values(error.errors).map((item) => item.message || item)
      : error.errors;

  if (process.env.NODE_ENV !== 'test' && statusCode >= 500) {
    console.error(error);
  }

  errorResponse(res, message, statusCode, errors);
};

module.exports = { notFound, errorHandler };
