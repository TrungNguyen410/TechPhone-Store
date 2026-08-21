const express = require('express');
const uploadController = require('../controllers/uploadController');
const { upload, validateImageContent } = require('../middlewares/uploadMiddleware');
const { authorize, protect } = require('../middlewares/authMiddleware');
const env = require('../config/env');
const { errorResponse } = require('../utils/apiResponse');


const router = express.Router();


const requireLocalUploads = (_req, res, next) => {
  if (!env.localUploadsEnabled) {
    return errorResponse(
      res,
      'Local uploads are disabled on this deployment; use Cloudinary or a persistent HTTPS image URL',
      503,
    );
  }

  return next();
};


router.post(
  '/admin',
  protect,
  authorize('admin'),
  requireLocalUploads,
  upload.single('adminImage'),
  validateImageContent,
  uploadController.uploadSingle,
);

router.post(
  '/products',
  protect,
  authorize('admin'),
  requireLocalUploads,
  upload.single('productImage'),
  validateImageContent,
  uploadController.uploadSingle,
);

router.post(
  '/banners',
  protect,
  authorize('admin'),
  requireLocalUploads,
  upload.single('bannerImage'),
  validateImageContent,
  uploadController.uploadSingle,
);

router.post(
  '/avatar',
  protect,
  requireLocalUploads,
  upload.single('avatar'),
  validateImageContent,
  uploadController.uploadSingle,
);

router.post(
  '/reviews',
  protect,
  requireLocalUploads,
  upload.single('reviewImage'),
  validateImageContent,
  uploadController.uploadSingle,
);


module.exports = router;
