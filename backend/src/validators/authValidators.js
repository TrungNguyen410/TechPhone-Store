const { body } = require('express-validator');

const register = [
  body('fullName').trim().notEmpty().withMessage('Họ và tên là bắt buộc'),
  body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ'),
  body('phone').trim().isLength({ min: 9, max: 15 }).withMessage('Số điện thoại phải có từ 9 đến 15 ký tự'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('role').not().exists().withMessage('Không được chỉ định vai trò khi đăng ký'),
];

const login = [
  body().custom((value) => {
    if (!value.identifier && !value.email && !value.phone) {
      throw new Error('Vui lòng nhập email hoặc số điện thoại');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('Mật khẩu là bắt buộc'),
];

const verifyRegistrationOtp = [
  body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ'),
  body('otp').trim().matches(/^\d{6}$/).withMessage('Mã OTP phải gồm 6 chữ số'),
];

const requestPasswordReset = [
  body('identifier').trim().notEmpty().withMessage('Email hoặc số điện thoại là bắt buộc'),
  body('channel').isIn(['email', 'sms']).withMessage('Kênh nhận OTP không hợp lệ'),
];

const resetPassword = [
  ...requestPasswordReset,
  body('otp').trim().matches(/^\d{6}$/).withMessage('Mã OTP phải gồm 6 chữ số'),
  body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
];

const updateProfile = [
  body('fullName').optional().trim().notEmpty().withMessage('Họ và tên không được để trống'),
  body('phone').optional().trim().isLength({ min: 9, max: 15 }).withMessage('Số điện thoại phải có từ 9 đến 15 ký tự'),
  body('address').optional().trim(),
  body('avatar').optional().trim(),
];

const changePassword = [
  body('currentPassword').notEmpty().withMessage('Mật khẩu hiện tại là bắt buộc'),
  body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
];

const refresh = [body('refreshToken').notEmpty().withMessage('Mã làm mới phiên đăng nhập là bắt buộc')];
const logout = [body('refreshToken').optional().isString()];

module.exports = {
  register,
  verifyRegistrationOtp,
  requestPasswordReset,
  resetPassword,
  login,
  updateProfile,
  changePassword,
  refresh,
  logout,
};
