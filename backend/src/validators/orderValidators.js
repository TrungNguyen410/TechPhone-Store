const { body, query } = require('express-validator');
const { normalizeVietnamesePhone } = require('../utils/phone');

const statuses = ['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled'];
const MAX_ORDER_ITEMS = 50;

const commonCreate = [
  body('items').isArray({ min: 1, max: MAX_ORDER_ITEMS })
    .withMessage(`Đơn hàng phải có từ 1 đến ${MAX_ORDER_ITEMS} dòng sản phẩm`),
  body('items.*').custom((item) => {
    if (!item.id && !item.productId && !item.accessoryId) {
      throw new Error('Mỗi sản phẩm trong đơn hàng phải có mã định danh');
    }
    return true;
  }),
  body('items.*.type').optional().isIn(['product', 'accessory']).withMessage('Loại mặt hàng không hợp lệ'),
  body('items.*.quantity').isInt({ min: 1, max: 20 }).withMessage('Số lượng mặt hàng không hợp lệ'),
  body('customer.fullName').trim().notEmpty().isLength({ max: 120 }),
  body('customer.email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('customer.phone').trim().custom((value) => Boolean(normalizeVietnamesePhone(value))),
  body('customer.address').trim().notEmpty().isLength({ max: 255 }),
  body('customer.province').trim().notEmpty().isLength({ max: 100 }),
  body('customer.district').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('customer.ward').trim().notEmpty().isLength({ max: 100 }),
  body('voucherCode').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
];

const createDirect = [
  ...commonCreate,
  body('paymentMethod').optional().isIn(['cod', 'bank', 'momo'])
    .withMessage('Đơn thẻ phải được tạo qua cổng VNPay'),
];

const createVnpay = [
  ...commonCreate,
  body('paymentMethod').optional().isIn(['card'])
    .withMessage('Phương thức thanh toán VNPay không hợp lệ'),
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

module.exports = { createDirect, createVnpay, update, updateStatus, lookup };
