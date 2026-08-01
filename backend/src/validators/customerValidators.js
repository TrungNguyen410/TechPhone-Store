const { body } = require('express-validator');

const update = [
  body('fullName').optional().trim().notEmpty().withMessage('Họ và tên không được để trống'),
  body('phone').optional().trim().isLength({ min: 9, max: 15 }).withMessage('Số điện thoại phải có từ 9 đến 15 ký tự'),
  body('address').optional().trim(),
  body('status').optional().isIn(['active', 'locked', 'inactive']).withMessage('Trạng thái khách hàng không hợp lệ'),
];

module.exports = { update };
