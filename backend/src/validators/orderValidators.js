const { body, query } = require('express-validator');

const statuses = ['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled'];

const create = [
  body('items').isArray({ min: 1 }).withMessage('Đơn hàng phải có ít nhất một sản phẩm'),
  body('items.*').custom((item) => {
    if (!item.id && !item.productId && !item.accessoryId) {
      throw new Error('Mỗi sản phẩm trong đơn hàng phải có mã định danh');
    }
    return true;
  }),
  body('items.*.type').optional().isIn(['product', 'accessory']).withMessage('Loại mặt hàng không hợp lệ'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Số lượng mặt hàng phải là số nguyên dương'),
  body('customer.fullName').trim().notEmpty().withMessage('Họ và tên người nhận là bắt buộc'),
  body('customer.email').isEmail().normalizeEmail().withMessage('Email người nhận không hợp lệ'),
  body('customer.phone').trim().isLength({ min: 9, max: 15 }).withMessage('Số điện thoại người nhận phải có từ 9 đến 15 ký tự'),
  body('customer.address').trim().notEmpty().withMessage('Địa chỉ nhận hàng là bắt buộc'),
  body('customer.province').optional().trim().isLength({ max: 100 }),
  body('customer.district').optional().trim().isLength({ max: 100 }),
  body('customer.ward').optional().trim().isLength({ max: 100 }),
  body('paymentMethod').optional().isIn(['cod', 'bank', 'momo', 'card']).withMessage('Phương thức thanh toán không hợp lệ'),
  body('subtotal').optional().isFloat({ min: 0 }),
  body('shippingFee').optional().isFloat({ min: 0 }),
  body('discount').optional().isFloat({ min: 0 }),
  body('total').optional().isFloat({ min: 0 }),
  body('paymentReference').optional().trim().isLength({ max: 100 }),
];

const update = [
  body().custom((payload) => {
    const safeFields = [
      'customer',
      'note',
      'shippingProvider',
      'trackingNumber',
      'estimatedDelivery',
    ];
    const fields = Object.keys(payload || {});
    if (!fields.length || fields.some((field) => !safeFields.includes(field))) {
      throw new Error('Chỉ được cập nhật thông tin khách hàng và giao hàng tại đây');
    }
    return true;
  }),
  body('customer').optional().isObject().withMessage('Thông tin khách hàng phải là một đối tượng'),
  body('note').optional().trim(),
  body('shippingProvider').optional().trim().isLength({ max: 100 }),
  body('trackingNumber').optional().trim().isLength({ max: 100 }),
  body('estimatedDelivery').optional({ nullable: true }).isISO8601().toDate(),
];

const updateStatus = [body('status').isIn(statuses).withMessage('Trạng thái đơn hàng không hợp lệ')];

const lookup = [
  query('orderNumber').trim().notEmpty().withMessage('Mã đơn hàng là bắt buộc'),
  query('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
];

module.exports = { create, update, updateStatus, lookup };
