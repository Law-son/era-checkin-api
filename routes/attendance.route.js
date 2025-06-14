const express = require('express');
const router = express.Router();
const { protect, restrictTo, isActive } = require('../middleware/auth');
const attendanceController = require('../controllers/attendance.controller');

// Protected routes
router.use(protect);
router.use(isActive);

// Admin routes
router.get('/', restrictTo('admin', 'superadmin'), attendanceController.getAllAttendance);
router.get('/stats', restrictTo('admin', 'superadmin'), attendanceController.getAttendanceStats);
router.get('/export', restrictTo('admin', 'superadmin'), attendanceController.exportAttendance);
router.get('/member/:memberId', restrictTo('admin', 'superadmin'), attendanceController.getMemberAttendance);
router.get('/today', restrictTo('admin', 'superadmin'), attendanceController.getTodayAttendance);
router.get('/analytics', restrictTo('admin', 'superadmin'), attendanceController.getAnalytics);
router.get('/heatmap', restrictTo('admin', 'superadmin'), attendanceController.getHeatmapData);
router.get('/top-active', restrictTo('admin', 'superadmin'), attendanceController.getTopActiveMembers);
router.get('/inactive', restrictTo('admin', 'superadmin'), attendanceController.getInactiveMembers);
router.get('/:id', restrictTo('admin', 'superadmin'), attendanceController.getAttendance);

// Manual check-in/out (admin only)
router.post('/manual-check-in', restrictTo('admin', 'superadmin'), attendanceController.manualCheckIn);
router.post('/manual-check-out', restrictTo('admin', 'superadmin'), attendanceController.manualCheckOut);

module.exports = router; 