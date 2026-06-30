const { body } = require('express-validator');

const register = [
  body('fullName').trim().notEmpty().withMessage('fullName is required'),
  body('email').isEmail().normalizeEmail().withMessage('valid email is required'),
  body('phone').trim().isLength({ min: 9, max: 15 }).withMessage('valid phone is required'),
  body('password').isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  body('role').not().exists().withMessage('role cannot be set during registration'),
];

const login = [
  body().custom((value) => {
    if (!value.identifier && !value.email && !value.phone) {
      throw new Error('identifier, email, or phone is required');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('password is required'),
];

const updateProfile = [
  body('fullName').optional().trim().notEmpty().withMessage('fullName cannot be empty'),
  body('phone').optional().trim().isLength({ min: 9, max: 15 }).withMessage('valid phone is required'),
  body('address').optional().trim(),
  body('avatar').optional().trim(),
];

const changePassword = [
  body('currentPassword').notEmpty().withMessage('currentPassword is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('newPassword must be at least 6 characters'),
];

const refresh = [body('refreshToken').notEmpty().withMessage('refreshToken is required')];
const logout = [body('refreshToken').optional().isString()];

module.exports = { register, login, updateProfile, changePassword, refresh, logout };
