const express = require('express');
const router = express.Router();
const { protect, restrictTo, isActive } = require('../middleware/auth');
const memberController = require('../controllers/member.controller');

// Debug middleware
router.use((req, res, next) => {
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Request params:', req.params);
  console.log('Request query:', req.query);
  console.log('Request body:', req.body);
  console.log('Route stack:', router.stack.map(r => ({
    route: r.route ? r.route.path : 'middleware',
    method: r.route ? Object.keys(r.route.methods) : 'all'
  })));
  next();
});

// Public routes
router.post('/register', memberController.register);
router.post('/check-in', memberController.checkIn);
router.post('/check-out', memberController.checkOut);

// Protected routes (admin only)
router.use(protect);
router.use(isActive);

// Card issuance routes (must be before other routes with parameters)
router.get('/without-cards', restrictTo('admin', 'superadmin'), memberController.getMembersWithoutCards);
router.post('/card/issue', restrictTo('admin', 'superadmin'), memberController.issueCard);

// Admin routes
router.get('/', restrictTo('admin', 'superadmin'), memberController.getAllMembers);
router.get('/present', restrictTo('admin', 'superadmin'), memberController.getPresentMembers);
router.get('/stats', restrictTo('admin', 'superadmin'), memberController.getMemberStats);

// Member CRUD routes with ID parameter
router.get('/:id', restrictTo('admin', 'superadmin'), memberController.getMember);
router.put('/:id', restrictTo('admin', 'superadmin'), memberController.updateMember);
router.delete('/:id', restrictTo('superadmin'), memberController.deleteMember);

// Export routes
module.exports = router; 