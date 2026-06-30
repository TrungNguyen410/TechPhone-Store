const { body, query } = require('express-validator');

const statuses = ['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled'];

const create = [
  body('items').isArray({ min: 1 }).withMessage('items are required'),
  body('items.*').custom((item) => {
    if (!item.id && !item.productId && !item.accessoryId) {
      throw new Error('item id is required');
    }
    return true;
  }),
  body('items.*.type').optional().isIn(['product', 'accessory']).withMessage('item type is invalid'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('item quantity is invalid'),
  body('customer.fullName').trim().notEmpty().withMessage('customer fullName is required'),
  body('customer.email').isEmail().normalizeEmail().withMessage('valid customer email is required'),
  body('customer.phone').trim().isLength({ min: 9, max: 15 }).withMessage('valid customer phone is required'),
  body('customer.address').trim().notEmpty().withMessage('customer address is required'),
  body('paymentMethod').optional().isIn(['cod', 'bank', 'momo', 'card']).withMessage('paymentMethod is invalid'),
  body('subtotal').optional().isFloat({ min: 0 }),
  body('shippingFee').optional().isFloat({ min: 0 }),
  body('discount').optional().isFloat({ min: 0 }),
  body('total').optional().isFloat({ min: 0 }),
];

const update = [
  body('status').optional().isIn(statuses).withMessage('status is invalid'),
  body('customer').optional().isObject().withMessage('customer must be an object'),
  body('note').optional().trim(),
];

const updateStatus = [body('status').isIn(statuses).withMessage('status is invalid')];

const lookup = [
  query('orderNumber').trim().notEmpty().withMessage('orderNumber is required'),
  query('phone').trim().notEmpty().withMessage('phone is required'),
];

module.exports = { create, update, updateStatus, lookup };
