const express = require('express');
const uploadController = require('../controllers/uploadController');
const upload = require('../middlewares/uploadMiddleware');
const { authorize, protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/products', protect, authorize('admin'), upload.single('productImage'), uploadController.uploadSingle);
router.post('/banners', protect, authorize('admin'), upload.single('bannerImage'), uploadController.uploadSingle);
router.post('/avatar', protect, upload.single('avatar'), uploadController.uploadSingle);
router.post('/reviews', protect, upload.single('reviewImage'), uploadController.uploadSingle);

module.exports = router;
