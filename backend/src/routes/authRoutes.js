const express = require('express');
const authController = require('../controllers/authController');
const validators = require('../validators/authValidators');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', validators.register, validate, authController.register);
router.post('/login', validators.login, validate, authController.login);
router.post('/refresh', validators.refresh, validate, authController.refresh);
router.post('/logout', validators.logout, validate, authController.logout);
router.get('/me', protect, authController.me);
router.put('/profile', protect, validators.updateProfile, validate, authController.updateProfile);
router.put('/change-password', protect, validators.changePassword, validate, authController.changePassword);

module.exports = router;
