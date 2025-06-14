const express = require('express');
const router = express.Router();
const { protect, restrictTo, isActive } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

// Public routes
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Protected routes
router.use(protect);
router.use(isActive);

// Admin routes
router.post('/change-password', authController.changePassword);
router.get('/me', authController.getMe);
router.put('/update-me', authController.updateMe);

// Super admin routes
router.post('/register', restrictTo('superadmin'), authController.register);
router.get('/admins', restrictTo('superadmin'), authController.getAllAdmins);
router.put('/admins/:id', restrictTo('superadmin'), authController.updateAdmin);
router.delete('/admins/:id', restrictTo('superadmin'), authController.deleteAdmin);

module.exports = router; 