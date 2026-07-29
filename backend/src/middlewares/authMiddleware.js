const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [, token] = header.startsWith('Bearer ') ? header.split(' ') : [];
  if (!token) throw new AppError('Authentication token is required', 401);

  const payload = jwt.verify(token, env.jwtAccessSecret);
  const user = await User.findOne({ _id: payload.sub, isDeleted: false });
  if (!user || user.status !== 'active') throw new AppError('User is not authorized', 401);

  req.user = user.toJSON();
  return next();
});

// Allows public flows (such as guest checkout) to retain the customer identity
// when a valid bearer token is present, without making authentication mandatory.
const optionalProtect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [, token] = header.startsWith('Bearer ') ? header.split(' ') : [];
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    const user = await User.findOne({ _id: payload.sub, isDeleted: false });
    if (!user || user.status !== 'active') throw new AppError('User is not authorized', 401);
    req.user = user.toJSON();
  } catch {
    throw new AppError('Authentication token is invalid or expired', 401);
  }
  return next();
});

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Insufficient permissions', 403));
  }
  return next();
};

module.exports = { protect, optionalProtect, authorize };
