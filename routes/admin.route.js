const express = require('express');
const router = express.Router();
const { protect, restrictTo, isActive } = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');

// Protected routes
router.use(protect);
router.use(isActive);

// Dashboard routes
router.get('/dashboard', restrictTo('admin', 'superadmin'), adminController.getDashboardStats);
router.get('/dashboard/today', restrictTo('admin', 'superadmin'), adminController.getTodayStats);
router.get('/dashboard/weekly', restrictTo('admin', 'superadmin'), adminController.getWeeklyStats);
router.get('/dashboard/monthly', restrictTo('admin', 'superadmin'), adminController.getMonthlyStats);

// Reports routes
router.get('/reports/attendance', restrictTo('admin', 'superadmin'), adminController.getAttendanceReport);
router.get('/reports/members', restrictTo('admin', 'superadmin'), adminController.getMembersReport);
router.get('/reports/analytics', restrictTo('admin', 'superadmin'), adminController.getAnalyticsReport);
router.get('/reports/analytics/top-active', restrictTo('admin', 'superadmin'), adminController.getTopActiveMembers);
router.get('/reports/analytics/inactive', restrictTo('admin', 'superadmin'), adminController.getInactiveMembers);
router.post('/reports/export', restrictTo('admin', 'superadmin'), adminController.exportReport);

// Live monitoring
router.get('/live/present', restrictTo('admin', 'superadmin'), adminController.getPresentMembers);
router.get('/live/stats', restrictTo('admin', 'superadmin'), adminController.getLiveStats);

// Search and filters
router.get('/search/members', restrictTo('admin', 'superadmin'), adminController.searchMembers);
router.get('/search/attendance', restrictTo('admin', 'superadmin'), adminController.searchAttendance);

module.exports = router; 