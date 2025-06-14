const mongoose = require('mongoose');
const connection = require('../config/db');

const attendanceSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date
  },
  duration: {
    type: Number, // Duration in minutes
    default: 0
  },
  status: {
    type: String,
    enum: ['checked-in', 'checked-out'],
    default: 'checked-in'
  },
  checkInLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  checkOutLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  notes: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
attendanceSchema.index({ member: 1, checkIn: -1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ checkInLocation: '2dsphere' });
attendanceSchema.index({ checkOutLocation: '2dsphere' });

// Virtual for formatted duration
attendanceSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  return `${hours}h ${minutes}m`;
});

// Pre-save middleware to calculate duration when checking out
attendanceSchema.pre('save', function(next) {
  if (this.checkOut && this.checkIn) {
    this.duration = Math.round((this.checkOut - this.checkIn) / (1000 * 60)); // Convert to minutes
  }
  next();
});

const Attendance = connection.model('Attendance', attendanceSchema);

module.exports = Attendance;
