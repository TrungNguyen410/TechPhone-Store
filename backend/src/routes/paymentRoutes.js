const express = require('express');
const paymentController = require('../controllers/paymentController');
const orderValidators = require('../validators/orderValidators');
const validate = require('../middlewares/validate');
const { optionalProtect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/config', paymentController.getConfig);
router.post(
  '/vnpay/checkout',
  optionalProtect,
  orderValidators.create,
  validate,
  paymentController.createVnpayCheckout,
);
router.get('/vnpay/ipn', paymentController.vnpayIpn);
router.get('/vnpay/return', paymentController.vnpayReturn);

module.exports = router;
