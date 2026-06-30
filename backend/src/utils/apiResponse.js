const successResponse = (res, data = {}, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

const errorResponse = (res, message = 'Internal server error', statusCode = 500, errors = null) =>
  res.status(statusCode).json({
    success: false,
    message,
    data: errors ? { errors } : {},
  });

module.exports = { successResponse, errorResponse };
