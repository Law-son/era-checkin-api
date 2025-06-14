const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const Admin = require('../models/admin.model');
const { success, error } = require('../utils/response');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Login admin
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if email and password exist
  if (!email || !password) {
    return error(res, 'Please provide email and password', 400);
  }

  // Check if admin exists && password is correct
  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    return error(res, 'Incorrect email or password', 401);
  }

  // Check if admin is active
  if (admin.status !== 'active') {
    return error(res, 'Your account is not active. Please contact super admin.', 403);
  }

  // Update last login
  admin.lastLogin = Date.now();
  await admin.save();

  // Generate token
  const token = generateToken(admin._id);

  // Remove password from output
  admin.password = undefined;

  return success(res, {
    token,
    admin
  });
});

// Register new admin (super admin only)
exports.register = asyncHandler(async (req, res) => {
  const { email, password, fullName, role } = req.body;

  // Check if admin exists
  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    return error(res, 'Admin already exists with this email', 400);
  }

  // Create admin
  const admin = await Admin.create({
    email,
    password,
    fullName,
    role: role || 'admin'
  });

  // Remove password from output
  admin.password = undefined;

  return success(res, { admin }, 'Admin registered successfully', 201);
});

// Get current admin
exports.getMe = asyncHandler(async (req, res) => {
  return success(res, { admin: req.admin });
});

// Update current admin
exports.updateMe = asyncHandler(async (req, res) => {
  // Check if password update is attempted
  if (req.body.password) {
    return error(res, 'This route is not for password updates. Please use /change-password', 400);
  }

  // Filter allowed fields
  const filteredBody = {
    fullName: req.body.fullName,
    email: req.body.email
  };

  const admin = await Admin.findByIdAndUpdate(
    req.admin.id,
    filteredBody,
    { new: true, runValidators: true }
  );

  return success(res, { admin });
});

// Change password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get admin with password
  const admin = await Admin.findById(req.admin.id).select('+password');

  // Check current password
  if (!(await admin.comparePassword(currentPassword))) {
    return error(res, 'Your current password is incorrect', 401);
  }

  // Update password
  admin.password = newPassword;
  await admin.save();

  // Generate new token
  const token = generateToken(admin._id);

  // Remove password from output
  admin.password = undefined;

  return success(res, { token, admin });
});

// Forgot password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Get admin
  const admin = await Admin.findOne({ email });
  if (!admin) {
    return error(res, 'There is no admin with this email address', 404);
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  admin.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  admin.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await admin.save();

  // In a real application, send email with reset token
  // For development, just return the token
  return success(res, { resetToken }, 'Reset token generated successfully');
});

// Reset password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // Get admin based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const admin = await Admin.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!admin) {
    return error(res, 'Token is invalid or has expired', 400);
  }

  // Update password
  admin.password = password;
  admin.passwordResetToken = undefined;
  admin.passwordResetExpires = undefined;
  await admin.save();

  // Generate new token
  const newToken = generateToken(admin._id);

  // Remove password from output
  admin.password = undefined;

  return success(res, { token: newToken, admin });
});

// Get all admins (super admin only)
exports.getAllAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find().select('-password');
  return success(res, { admins });
});

// Update admin (super admin only)
exports.updateAdmin = asyncHandler(async (req, res) => {
  const admin = await Admin.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  ).select('-password');

  if (!admin) {
    return error(res, 'Admin not found', 404);
  }

  return success(res, { admin });
});

// Delete admin (super admin only)
exports.deleteAdmin = asyncHandler(async (req, res) => {
  const admin = await Admin.findByIdAndDelete(req.params.id);
  if (!admin) {
    return error(res, 'Admin not found', 404);
  }

  return success(res, null, 'Admin deleted successfully');
}); 