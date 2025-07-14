const asyncHandler = require('express-async-handler');
const dayjs = require('dayjs');
const Member = require('../models/member.model');
const Attendance = require('../models/attendance.model');
const { success, error } = require('../utils/response');
const PdfPrinter = require('pdfmake');
const fonts = {
  Roboto: {
    normal: 'fonts/Roboto-Regular.ttf',
    bold: 'fonts/Roboto-Bold.ttf',
    italics: 'fonts/Roboto-Italic.ttf',
    bolditalics: 'fonts/Roboto-BoldItalic.ttf'
  }
};
const printer = new PdfPrinter(fonts);

// Get dashboard stats
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const today = dayjs().startOf('day');
  const thisWeek = dayjs().startOf('week');
  const thisMonth = dayjs().startOf('month');

  // Member stats
  const memberStats = await Member.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        active: [
          { $match: { status: 'active' } },
          { $count: 'count' }
        ],
        present: [
          { $match: { isPresent: true } },
          { $count: 'count' }
        ],
        membershipTypes: [
          {
            $group: {
              _id: '$membershipType',
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);

  // Attendance stats
  const attendanceStats = await Attendance.aggregate([
    {
      $facet: {
        today: [
          { $match: { checkIn: { $gte: today.toDate() } } },
          { $count: 'count' }
        ],
        week: [
          { $match: { checkIn: { $gte: thisWeek.toDate() } } },
          { $count: 'count' }
        ],
        month: [
          { $match: { checkIn: { $gte: thisMonth.toDate() } } },
          { $count: 'count' }
        ],
        avgDuration: [
          { $match: { status: 'checked-out' } },
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

  const stats = {
    members: {
      total: memberStats[0].total[0]?.count || 0,
      active: memberStats[0].active[0]?.count || 0,
      present: memberStats[0].present[0]?.count || 0,
      membershipTypes: memberStats[0].membershipTypes
    },
    attendance: {
      today: attendanceStats[0].today[0]?.count || 0,
      week: attendanceStats[0].week[0]?.count || 0,
      month: attendanceStats[0].month[0]?.count || 0,
      avgDuration: Math.round(attendanceStats[0].avgDuration[0]?.avg || 0)
    }
  };

  return success(res, { stats });
});

// Get today's stats
exports.getTodayStats = asyncHandler(async (req, res) => {
  const today = dayjs().startOf('day');
  const now = dayjs();

  const stats = await Attendance.aggregate([
    {
      $match: {
        checkIn: { $gte: today.toDate() }
      }
    },
    {
      $facet: {
        totalCheckins: [{ $count: 'count' }],
        currentlyPresent: [
          { $match: { status: 'checked-in' } },
          { $count: 'count' }
        ],
        avgDuration: [
          { $match: { status: 'checked-out' } },
          {
            $group: {
              _id: null,
              avg: { $avg: '$duration' }
            }
          }
        ],
        hourlyDistribution: [
          {
            $group: {
              _id: { $hour: '$checkIn' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': 1 } }
        ]
      }
    }
  ]);

  return success(res, { stats: stats[0] });
});

// Get weekly stats
exports.getWeeklyStats = asyncHandler(async (req, res) => {
  const startOfWeek = dayjs().startOf('week');
  const endOfWeek = dayjs().endOf('week');

  const stats = await Attendance.aggregate([
    {
      $match: {
        checkIn: {
          $gte: startOfWeek.toDate(),
          $lte: endOfWeek.toDate()
        }
      }
    },
    {
      $group: {
        _id: { $dayOfWeek: '$checkIn' },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return success(res, { stats });
});

// Get monthly stats
exports.getMonthlyStats = asyncHandler(async (req, res) => {
  const startOfMonth = dayjs().startOf('month');
  const endOfMonth = dayjs().endOf('month');

  const stats = await Attendance.aggregate([
    {
      $match: {
        checkIn: {
          $gte: startOfMonth.toDate(),
          $lte: endOfMonth.toDate()
        }
      }
    },
    {
      $group: {
        _id: { $dayOfMonth: '$checkIn' },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return success(res, { stats });
});

// Get attendance report
exports.getAttendanceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? dayjs(startDate) : dayjs().subtract(30, 'day');
  const end = endDate ? dayjs(endDate) : dayjs();

  const report = await Attendance.aggregate([
    {
      $match: {
        checkIn: {
          $gte: start.toDate(),
          $lte: end.toDate()
        }
      }
    },
    {
      $lookup: {
        from: 'members',
        localField: 'member',
        foreignField: '_id',
        as: 'memberDetails'
      }
    },
    {
      $unwind: '$memberDetails'
    },
    {
      $group: {
        _id: '$member',
        member: { $first: '$memberDetails' },
        totalVisits: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);

  return success(res, { report });
});

// Get members report
exports.getMembersReport = asyncHandler(async (req, res) => {
  const report = await Member.aggregate([
    {
      $lookup: {
        from: 'attendances',
        localField: '_id',
        foreignField: 'member',
        as: 'attendance'
      }
    },
    {
      $project: {
        fullName: 1,
        email: 1,
        memberId: 1,
        membershipType: 1,
        status: 1,
        totalVisits: { $size: '$attendance' },
        lastVisit: { $max: '$attendance.checkIn' }
      }
    }
  ]);

  return success(res, { report });
});

// Get analytics report
exports.getAnalyticsReport = asyncHandler(async (req, res) => {
  const { period, startDate, endDate } = req.query;
  
  // Validate dates
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  
  if (!start.isValid() || !end.isValid()) {
    return error(res, 'Invalid date format', 400);
  }

  // Get daily trends
  const dailyTrends = await Attendance.aggregate([
    {
      $match: {
        checkIn: {
          $gte: start.startOf('day').toDate(),
          $lte: end.endOf('day').toDate()
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$checkIn' }
        },
        total: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        date: { $concat: [{ $toString: '$_id' }, 'T00:00:00.000Z'] },
        total: 1
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);

  // Get department distribution from Member collection
  const departmentDistribution = await Member.aggregate([
    {
      $match: {
        department: { $ne: 'None' },
        status: 'active'  // Only count active members
      }
    },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        department: '$_id',
        count: 1
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  return success(res, {
    analytics: {
      dailyTrends,
      departmentDistribution
    }
  });
});

// Export report
exports.exportReport = asyncHandler(async (req, res) => {
  const { type, startDate, endDate, format = 'json' } = req.query;
  const start = startDate ? dayjs(startDate) : dayjs().subtract(30, 'day');
  const end = endDate ? dayjs(endDate) : dayjs();

  let data;
  if (type === 'analytics') {
    // Get analytics data
    const dailyTrends = await Attendance.aggregate([
      {
        $match: {
          checkIn: {
            $gte: start.startOf('day').toDate(),
            $lte: end.endOf('day').toDate()
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkIn' } },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const departmentDistribution = await Member.aggregate([
      {
        $match: {
          department: { $ne: 'None' },
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    data = { dailyTrends, departmentDistribution };
  } else {
    switch (type) {
      case 'attendance':
        data = await Attendance.find({
          checkIn: { $gte: start.toDate(), $lte: end.toDate() }
        }).populate('member', 'memberId fullName email');
        break;
      case 'members':
        data = await Member.find().select('-__v');
        break;
      default:
        return error(res, 'Invalid report type', 400);
    }
  }

  if (format === 'pdf') {
    let docDefinition;
    if (type === 'attendance') {
      const body = [
        ['Member ID', 'Full Name', 'Email', 'Check In', 'Check Out', 'Duration', 'Status'],
        ...data.map(record => [
          record.member.memberId,
          record.member.fullName,
          record.member.email,
          dayjs(record.checkIn).format('YYYY-MM-DD HH:mm'),
          record.checkOut ? dayjs(record.checkOut).format('YYYY-MM-DD HH:mm') : '',
          record.duration != null ? record.duration.toString() : '',
          record.status
        ])
      ];
      docDefinition = {
        content: [
          { text: 'Attendance Report', style: 'header' },
          {
            table: {
              headerRows: 1,
              widths: [60, 100, 120, 80, 80, 50, 50],
              body
            },
            layout: 'lightHorizontalLines',
            style: 'tableContent'
          }
        ],
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
          tableContent: { fontSize: 9 }
        }
      };
    } else if (type === 'members') {
      const body = [
        ['Member ID', 'Full Name', 'Email', 'Membership Type', 'Status', 'Total Visits', 'Last Visit'],
        ...data.map(record => [
          record.memberId,
          record.fullName,
          record.email,
          record.membershipType,
          record.status,
          record.totalVisits != null ? record.totalVisits.toString() : '',
          record.lastVisit ? dayjs(record.lastVisit).format('YYYY-MM-DD HH:mm:ss') : ''
        ])
      ];
      docDefinition = {
        content: [
          { text: 'Members Report', style: 'header' },
          {
            table: {
              headerRows: 1,
              widths: [60, 100, 120, 80, 60, 50, 80],
              body
            },
            layout: 'lightHorizontalLines',
            style: 'tableContent'
          }
        ],
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
          tableContent: { fontSize: 9 }
        }
      };
    } else if (type === 'analytics') {
      const trendsBody = [
        ['Date', 'Total'],
        ...(data.dailyTrends.length > 0
          ? data.dailyTrends.map(row => [row._id, row.total])
          : [['No data available', '']])
      ];
      const deptBody = [
        ['Department', 'Count'],
        ...(data.departmentDistribution.length > 0
          ? data.departmentDistribution.map(row => [row._id, row.count])
          : [['No data available', '']])
      ];
      docDefinition = {
        content: [
          { text: 'Analytics Report', style: 'header' },
          { text: 'Daily Trends', style: 'subheader' },
          {
            table: {
              headerRows: 1,
              widths: [100, 60],
              body: trendsBody
            },
            layout: 'lightHorizontalLines',
            style: 'tableContent',
            margin: [0, 0, 0, 20]
          },
          { text: 'Department Distribution', style: 'subheader' },
          {
            table: {
              headerRows: 1,
              widths: [120, 60],
              body: deptBody
            },
            layout: 'lightHorizontalLines',
            style: 'tableContent'
          }
        ],
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
          subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
          tableContent: { fontSize: 9 }
        }
      };
    }
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
    pdfDoc.pipe(res);
    pdfDoc.end();
    return;
  }

  // Default to JSON format
  return success(res, { data });
});

// Get present members
exports.getPresentMembers = asyncHandler(async (req, res) => {
  const members = await Member.find({ isPresent: true })
    .select('memberId fullName email membershipType lastCheckIn');

  return success(res, { members });
});

// Get live stats
exports.getLiveStats = asyncHandler(async (req, res) => {
  const today = dayjs().startOf('day');

  const stats = await Attendance.aggregate([
    {
      $facet: {
        present: [
          { $match: { status: 'checked-in' } },
          { $count: 'count' }
        ],
        today: [
          { $match: { checkIn: { $gte: today.toDate() } } },
          { $count: 'count' }
        ],
        avgDuration: [
          {
            $match: {
              checkIn: { $gte: today.toDate() },
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

  return success(res, { stats: stats[0] });
});

// Search members
exports.searchMembers = asyncHandler(async (req, res) => {
  const { query, status, membershipType } = req.query;
  const searchQuery = {};

  if (query) {
    searchQuery.$or = [
      { fullName: new RegExp(query, 'i') },
      { email: new RegExp(query, 'i') },
      { memberId: new RegExp(query, 'i') }
    ];
  }

  if (status) searchQuery.status = status;
  if (membershipType) searchQuery.membershipType = membershipType;

  const members = await Member.find(searchQuery);
  return success(res, { members });
});

// Search attendance
exports.searchAttendance = asyncHandler(async (req, res) => {
  const { memberId, startDate, endDate, status } = req.query;
  const searchQuery = {};

  if (memberId) {
    const member = await Member.findOne({ memberId });
    if (member) searchQuery.member = member._id;
  }

  if (startDate || endDate) {
    searchQuery.checkIn = {};
    if (startDate) searchQuery.checkIn.$gte = dayjs(startDate).toDate();
    if (endDate) searchQuery.checkIn.$lte = dayjs(endDate).toDate();
  }

  if (status) searchQuery.status = status;

  const attendance = await Attendance.find(searchQuery)
    .populate('member', 'memberId fullName email')
    .sort({ checkIn: -1 });

  return success(res, { attendance });
});

// Get top active members
exports.getTopActiveMembers = asyncHandler(async (req, res) => {
  const { period = 'month', limit = 10 } = req.query;
  
  // Get the most recent attendance to base our date range on
  const mostRecent = await Attendance.findOne().sort({ checkIn: -1 });
  if (!mostRecent) {
    return success(res, { members: [] });
  }

  // Calculate start date based on the most recent attendance
  let startDate;
  const endDate = dayjs(mostRecent.checkIn);
  
  switch (period) {
    case 'week':
      startDate = endDate.subtract(1, 'week');
      break;
    case 'month':
      startDate = endDate.subtract(1, 'month');
      break;
    case 'year':
      startDate = endDate.subtract(1, 'year');
      break;
    default:
      startDate = endDate.subtract(1, 'month');
  }

  const members = await Attendance.aggregate([
    {
      $match: {
        checkIn: {
          $gte: startDate.toDate(),
          $lte: endDate.toDate()
        }
      }
    },
    {
      $group: {
        _id: '$member',
        checkInCount: { $sum: 1 },
        lastCheckIn: { $max: '$checkIn' }
      }
    },
    {
      $sort: { checkInCount: -1 }
    },
    {
      $limit: parseInt(limit)
    },
    {
      $lookup: {
        from: 'members',
        localField: '_id',
        foreignField: '_id',
        as: 'memberInfo'
      }
    },
    {
      $unwind: '$memberInfo'
    },
    {
      $project: {
        _id: 0,
        memberId: '$_id',
        fullName: '$memberInfo.fullName',
        department: '$memberInfo.department',
        checkInCount: 1,
        lastCheckIn: 1
      }
    }
  ]);

  return success(res, { members });
});

// Get inactive members
exports.getInactiveMembers = asyncHandler(async (req, res) => {
  const { days = 21 } = req.query;

  // First get the most recent attendance in the system to use as reference
  const mostRecent = await Attendance.findOne().sort({ checkIn: -1 });
  if (!mostRecent) {
    return success(res, { members: [] });
  }

  // Calculate cutoff date based on most recent attendance
  const referenceDate = dayjs(mostRecent.checkIn);
  const cutoffDate = referenceDate.subtract(parseInt(days), 'days');

  const members = await Member.aggregate([
    {
      $lookup: {
        from: 'attendances',
        localField: '_id',
        foreignField: 'member',
        as: 'lastAttendance'
      }
    },
    {
      $addFields: {
        lastCheckIn: { $max: '$lastAttendance.checkIn' }
      }
    },
    {
      $match: {
        status: 'active',
        $or: [
          { lastCheckIn: { $lt: cutoffDate.toDate() } },
          { lastCheckIn: null }
        ]
      }
    },
    {
      $addFields: {
        inactiveDays: {
          $cond: {
            if: { $eq: ['$lastCheckIn', null] },
            then: parseInt(days) + 1,  // For members who never checked in
            else: {
              $round: [
                {
                  $divide: [
                    { $subtract: [referenceDate.toDate(), '$lastCheckIn'] },
                    1000 * 60 * 60 * 24
                  ]
                }
              ]
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        memberId: '$_id',
        fullName: 1,
        department: 1,
        lastCheckIn: 1,
        inactiveDays: 1
      }
    },
    {
      $sort: { inactiveDays: -1 }
    }
  ]);

  return success(res, { members });
});

module.exports = exports; 