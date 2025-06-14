const asyncHandler = require('express-async-handler');
const dayjs = require('dayjs');
const Member = require('../models/member.model');
const Attendance = require('../models/attendance.model');
const { success, error, paginate } = require('../utils/response');

// Get all attendance records (with pagination)
exports.getAllAttendance = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.memberId) {
    const member = await Member.findOne({ memberId: req.query.memberId });
    if (member) query.member = member._id;
  }

  const total = await Attendance.countDocuments(query);
  const attendance = await Attendance.find(query)
    .populate('member', 'memberId fullName email')
    .skip(skip)
    .limit(limit)
    .sort({ checkIn: -1 });

  return paginate(res, attendance, page, limit, total);
});

// Get attendance stats
exports.getAttendanceStats = asyncHandler(async (req, res) => {
  const today = dayjs().startOf('day');
  const thisWeek = dayjs().startOf('week');
  const thisMonth = dayjs().startOf('month');

  const stats = await Attendance.aggregate([
    {
      $facet: {
        today: [
          {
            $match: {
              checkIn: { $gte: today.toDate() }
            }
          },
          {
            $count: 'count'
          }
        ],
        week: [
          {
            $match: {
              checkIn: { $gte: thisWeek.toDate() }
            }
          },
          {
            $count: 'count'
          }
        ],
        month: [
          {
            $match: {
              checkIn: { $gte: thisMonth.toDate() }
            }
          },
          {
            $count: 'count'
          }
        ],
        avgDuration: [
          {
            $match: {
              status: 'checked-out'
            }
          },
          {
            $group: {
              _id: null,
              avg: { $avg: '$duration' }
            }
          }
        ]
      }
    }
  ]);

  const formattedStats = {
    today: stats[0].today[0]?.count || 0,
    week: stats[0].week[0]?.count || 0,
    month: stats[0].month[0]?.count || 0,
    avgDuration: Math.round(stats[0].avgDuration[0]?.avg || 0)
  };

  return success(res, { stats: formattedStats });
});

// Get member attendance
exports.getMemberAttendance = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const member = await Member.findOne({ memberId });
  if (!member) {
    return error(res, 'Member not found', 404);
  }

  const total = await Attendance.countDocuments({ member: member._id });
  const attendance = await Attendance.find({ member: member._id })
    .skip(skip)
    .limit(limit)
    .sort({ checkIn: -1 });

  return paginate(res, attendance, page, limit, total);
});

// Get today's attendance
exports.getTodayAttendance = asyncHandler(async (req, res) => {
  const today = dayjs().startOf('day');

  const attendance = await Attendance.find({
    checkIn: { $gte: today.toDate() }
  }).populate('member', 'memberId fullName email');

  return success(res, { attendance });
});

// Get analytics data
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? dayjs(startDate) : dayjs().subtract(30, 'day');
  const end = endDate ? dayjs(endDate) : dayjs();

  const dailyAttendance = await Attendance.aggregate([
    {
      $match: {
        checkIn: { $gte: start.toDate(), $lte: end.toDate() }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkIn' } },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return success(res, { analytics: dailyAttendance });
});

// Get heatmap data
exports.getHeatmapData = asyncHandler(async (req, res) => {
  const heatmap = await Attendance.aggregate([
    {
      $group: {
        _id: {
          dayOfWeek: { $dayOfWeek: '$checkIn' },
          hour: { $hour: '$checkIn' }
        },
        count: { $sum: 1 }
      }
    }
  ]);

  return success(res, { heatmap });
});

// Get top active members
exports.getTopActiveMembers = asyncHandler(async (req, res) => {
  const { days = 30, limit = 10 } = req.query;
  const startDate = dayjs().subtract(days, 'day');

  const topMembers = await Attendance.aggregate([
    {
      $match: {
        checkIn: { $gte: startDate.toDate() }
      }
    },
    {
      $group: {
        _id: '$member',
        totalVisits: { $sum: 1 },
        totalDuration: { $sum: '$duration' }
      }
    },
    {
      $sort: { totalVisits: -1 }
    },
    {
      $limit: parseInt(limit)
    },
    {
      $lookup: {
        from: 'members',
        localField: '_id',
        foreignField: '_id',
        as: 'member'
      }
    },
    {
      $unwind: '$member'
    }
  ]);

  return success(res, { topMembers });
});

// Get inactive members
exports.getInactiveMembers = asyncHandler(async (req, res) => {
  const { days = 14 } = req.query;
  const cutoffDate = dayjs().subtract(days, 'day');

  const inactiveMembers = await Member.aggregate([
    {
      $lookup: {
        from: 'attendances',
        localField: '_id',
        foreignField: 'member',
        as: 'lastAttendance'
      }
    },
    {
      $match: {
        $or: [
          { lastAttendance: { $size: 0 } },
          { 'lastAttendance.checkIn': { $lt: cutoffDate.toDate() } }
        ]
      }
    }
  ]);

  return success(res, { inactiveMembers });
});

// Get single attendance record
exports.getAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id)
    .populate('member', 'memberId fullName email');

  if (!attendance) {
    return error(res, 'Attendance record not found', 404);
  }

  return success(res, { attendance });
});

// Manual check-in
exports.manualCheckIn = asyncHandler(async (req, res) => {
  const { memberId } = req.body;

  const member = await Member.findOne({ memberId });
  if (!member) {
    return error(res, 'Member not found', 404);
  }

  if (member.isPresent) {
    return error(res, 'Member is already checked in', 400);
  }

  const attendance = await Attendance.create({
    member: member._id,
    checkIn: new Date(),
    status: 'checked-in'
  });

  member.isPresent = true;
  member.lastCheckIn = attendance.checkIn;
  await member.save();

  return success(res, { attendance }, 'Manual check-in successful');
});

// Manual check-out
exports.manualCheckOut = asyncHandler(async (req, res) => {
  const { memberId } = req.body;

  const member = await Member.findOne({ memberId });
  if (!member) {
    return error(res, 'Member not found', 404);
  }

  if (!member.isPresent) {
    return error(res, 'Member is not checked in', 400);
  }

  const attendance = await Attendance.findOne({
    member: member._id,
    status: 'checked-in'
  });

  if (!attendance) {
    return error(res, 'No active attendance record found', 404);
  }

  attendance.checkOut = new Date();
  attendance.status = 'checked-out';
  await attendance.save();

  member.isPresent = false;
  member.lastCheckOut = attendance.checkOut;
  await member.save();

  return success(res, { attendance }, 'Manual check-out successful');
});

// Export attendance data
exports.exportAttendance = asyncHandler(async (req, res) => {
  const { startDate, endDate, format = 'csv' } = req.query;
  const start = startDate ? dayjs(startDate) : dayjs().subtract(30, 'day');
  const end = endDate ? dayjs(endDate) : dayjs();

  const attendance = await Attendance.find({
    checkIn: { $gte: start.toDate(), $lte: end.toDate() }
  }).populate('member', 'memberId fullName email');

  if (format === 'csv') {
    // Format data for CSV
    const csvData = attendance.map(record => ({
      memberId: record.member.memberId,
      fullName: record.member.fullName,
      email: record.member.email,
      checkIn: dayjs(record.checkIn).format('YYYY-MM-DD HH:mm:ss'),
      checkOut: record.checkOut ? dayjs(record.checkOut).format('YYYY-MM-DD HH:mm:ss') : '',
      duration: record.duration,
      status: record.status
    }));

    return success(res, { data: csvData, format: 'csv' });
  }

  // Default to JSON format
  return success(res, { attendance });
}); 