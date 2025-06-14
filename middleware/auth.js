const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');
const asyncHandler = require('express-async-handler');

// Response transformation middleware
const transformResponse = (req, res, next) => {
  const originalJson = res.json;
  res.json = function(obj) {
    if (res.get('X-No-Pagination')) {
      return originalJson.call(this, obj);
    }
    if (obj && obj.data && Array.isArray(obj.data)) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const total = obj.data.length;
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return originalJson.call(this, {
        ...obj,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null
        }
      });
    }
    return originalJson.call(this, obj);
  };
  next();
};

// Protect routes - Authentication middleware
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1) Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'You are not logged in. Please log in to get access.'
    });
  }

  try {
    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if admin still exists
    const currentAdmin = await Admin.findById(decoded.id);
    if (!currentAdmin) {
      return res.status(401).json({
        success: false,
        message: 'The admin belonging to this token no longer exists.'
      });
    }

    // 4) Check if admin changed password after the token was issued
    if (currentAdmin.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Admin recently changed password! Please log in again.'
      });
    }

    // Grant access to protected route
    req.admin = currentAdmin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.'
    });
  }
});

// Role-based authorization middleware
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Check if admin is active
exports.isActive = asyncHandler(async (req, res, next) => {
  if (req.admin.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Your account is not active. Please contact super admin.'
    });
  }
  next();
});

// Export middleware
exports.transformResponse = transformResponse;
