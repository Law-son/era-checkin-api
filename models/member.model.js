const mongoose = require('mongoose');
const connection = require('../config/db');

const memberSchema = new mongoose.Schema({
  memberId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female', 'other']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['ERA OPENLABS', 'ERA Softwares', 'ERA Manufacturing', 'ERA Education', 'None'],
    default: 'None',
    trim: true
  },
  issuedCard: {
    type: Boolean,
    default: false
  },
  membershipType: {
    type: String,
    required: [true, 'Membership type is required'],
    enum: ['Student', 'Staff', 'Executive', 'Guest', 'Managing Lead'],
    default: 'Student'
  },
  dateJoined: {
    type: Date,
    default: Date.now
  },
  isPresent: {
    type: Boolean,
    default: false
  },
  qrCodeUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastCheckIn: {
    type: Date
  },
  lastCheckOut: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for member's age
memberSchema.virtual('age').get(function() {
  return Math.floor((new Date() - this.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
});

// Index for faster queries
memberSchema.index({ memberId: 1, email: 1, phone: 1 });

const Member = connection.model('Member', memberSchema);

module.exports = Member;
