const express = require('express');
const authController = require('../controllers/authController');
const validators = require('../validators/authValidators');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/authMiddleware');
const rateLimit = require('../middlewares/rateLimit');

const router = express.Router();

const otpRequestLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const otpVerifyLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });

router.post('/register', otpRequestLimit, validators.register, validate, authController.register);
router.post('/register/request-otp', otpRequestLimit, validators.register, validate, authController.register);
router.post('/register/verify-otp', otpVerifyLimit, validators.verifyRegistrationOtp, validate, authController.verifyRegistrationOtp);
router.post('/forgot-password/request-otp', otpRequestLimit, validators.requestPasswordReset, validate, authController.requestPasswordReset);
router.post('/forgot-password/reset', otpVerifyLimit, validators.resetPassword, validate, authController.resetPassword);
router.post('/login', loginLimit, validators.login, validate, authController.login);
router.post('/refresh', validators.refresh, validate, authController.refresh);
router.post('/logout', validators.logout, validate, authController.logout);
router.get('/me', protect, authController.me);
router.put('/profile', protect, validators.updateProfile, validate, authController.updateProfile);
router.put('/change-password', protect, validators.changePassword, validate, authController.changePassword);
router.get('/wishlist', protect, authController.wishlist);
router.put('/wishlist', protect, authController.updateWishlist);

module.exports = router;
