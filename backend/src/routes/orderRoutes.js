const express = require('express');
const orderController = require('../controllers/orderController');
const validators = require('../validators/orderValidators');
const { idParam } = require('../validators/commonValidators');
const validate = require('../middlewares/validate');
const { authorize, protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', protect, validators.createDirect, validate, orderController.create);
router.get('/', protect, orderController.list);
router.get('/my-orders', protect, orderController.myOrders);
router.get('/lookup', validators.lookup, validate, orderController.lookup);
router.get('/:id', protect, idParam, validate, orderController.getById);
router.put('/:id', protect, authorize('admin'), idParam, validators.update, validate, orderController.update);
router.put('/:id/cancel', protect, idParam, validate, orderController.cancel);
router.delete('/:id', protect, authorize('admin'), idParam, validate, orderController.remove);

module.exports = router;
