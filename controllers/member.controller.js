const asyncHandler = require('express-async-handler');
const dayjs = require('dayjs');
const Member = require('../models/member.model');
const Attendance = require('../models/attendance.model');
const { generateQRCode } = require('../utils/qrcode');
const { success, error, paginate } = require('../utils/response');

// Generate unique member ID
const generateMemberId = async () => {
  const date = dayjs().format('YYMM');
  const lastMember = await Member.findOne({}, {}, { sort: { 'memberId': -1 } });
  const sequence = lastMember ? parseInt(lastMember.memberId.slice(-4)) + 1 : 1;
  return `${date}${sequence.toString().padStart(4, '0')}`;
};

// Register new member
exports.register = asyncHandler(async (req, res) => {
  const { fullName, gender, phone, email, dateOfBirth, department, membershipType } = req.body;

  // Check if member exists
  const existingMember = await Member.findOne({ $or: [{ email }, { phone }] });
  if (existingMember) {
    return error(res, 'Member already exists with this email or phone', 400);
  }

  // Generate member ID and QR code
  const memberId = await generateMemberId();
  const qrCodeUrl = await generateQRCode(memberId);

  // Create member
  const member = await Member.create({
    memberId,
    fullName,
    gender,
    phone,
    email,
    dateOfBirth,
    department,
    membershipType,
    qrCodeUrl
  });

  return success(res, { member }, 'Member registered successfully', 201);
});

// Check-in member
exports.checkIn = asyncHandler(async (req, res) => {
  const { memberId } = req.body;

  // Find member
  const member = await Member.findOne({ memberId });
  if (!member) {
    return error(res, 'Member not found', 404);
  }

  // Check if already checked in
  if (member.isPresent) {
    return error(res, 'Member is already checked in', 400);
  }

  // Create attendance record
  const attendance = await Attendance.create({
    member: member._id,
    checkIn: new Date(),
    status: 'checked-in'
  });

  // Update member status
  member.isPresent = true;
  member.lastCheckIn = attendance.checkIn;
  await member.save();

  return success(res, { attendance }, 'Check-in successful');
});

// Check-out member
exports.checkOut = asyncHandler(async (req, res) => {
  const { memberId } = req.body;

  // Find member
  const member = await Member.findOne({ memberId });
  if (!member) {
    return error(res, 'Member not found', 404);
  }

  // Check if checked in
  if (!member.isPresent) {
    return error(res, 'Member is not checked in', 400);
  }

  // Find active attendance record
  const attendance = await Attendance.findOne({
    member: member._id,
    status: 'checked-in'
  });

  if (!attendance) {
    return error(res, 'No active attendance record found', 404);
  }

  // Update attendance record
  attendance.checkOut = new Date();
  attendance.status = 'checked-out';
  await attendance.save();

  // Update member status
  member.isPresent = false;
  member.lastCheckOut = attendance.checkOut;
  await member.save();

  return success(res, { attendance }, 'Check-out successful');
});

// Get all members (with pagination)
exports.getAllMembers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.department) query.department = req.query.department;
  if (req.query.membershipType) query.membershipType = req.query.membershipType;

  const total = await Member.countDocuments(query);
  const members = await Member.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return paginate(res, members, page, limit, total);
});

// Get present members
exports.getPresentMembers = asyncHandler(async (req, res) => {
  const members = await Member.find({ isPresent: true });
  return success(res, { members }, 'Present members retrieved successfully');
});

// Get member stats
exports.getMemberStats = asyncHandler(async (req, res) => {
  const stats = await Member.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        present: { $sum: { $cond: [{ $eq: ['$isPresent', true] }, 1, 0] } },
        student: { $sum: { $cond: [{ $eq: ['$membershipType', 'Student'] }, 1, 0] } },
        staff: { $sum: { $cond: [{ $eq: ['$membershipType', 'Staff'] }, 1, 0] } },
        executive: { $sum: { $cond: [{ $eq: ['$membershipType', 'Executive'] }, 1, 0] } },
        guest: { $sum: { $cond: [{ $eq: ['$membershipType', 'Guest'] }, 1, 0] } },
        managingLead: { $sum: { $cond: [{ $eq: ['$membershipType', 'Managing Lead'] }, 1, 0] } }
      }
    }
  ]);

  return success(res, { stats: stats[0] }, 'Member stats retrieved successfully');
});

// Get single member
exports.getMember = asyncHandler(async (req, res) => {
  const member = await Member.findOne({ memberId: req.params.id });
  if (!member) {
    return error(res, 'Member not found', 404);
  }
  return success(res, { member }, 'Member retrieved successfully');
});

// Update member
exports.updateMember = asyncHandler(async (req, res) => {
  const member = await Member.findOneAndUpdate(
    { memberId: req.params.id },
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!member) {
    return error(res, 'Member not found', 404);
  }

  return success(res, { member }, 'Member updated successfully');
});

// Delete member
exports.deleteMember = asyncHandler(async (req, res) => {
  const member = await Member.findOne({ memberId: req.params.id });
  if (!member) {
    return error(res, 'Member not found', 404);
  }

  // Delete associated attendance records
  await Attendance.deleteMany({ member: member._id });
  
  // Delete the member
  await member.deleteOne();

  return success(res, null, 'Member deleted successfully');
});

// Issue card to a single member
exports.issueCard = asyncHandler(async (req, res) => {
  const { memberId } = req.body;
  console.log('Attempting to issue card for member:', memberId);
  console.log('Request body:', req.body);

  if (!memberId) {
    return error(res, 'Member ID is required', 400);
  }

  const member = await Member.findOne({ memberId });
  console.log('Found member:', member);

  if (!member) {
    return error(res, 'Member not found', 404);
  }

  if (member.issuedCard) {
    return error(res, 'Card has already been issued to this member', 400);
  }

  member.issuedCard = true;
  await member.save();

  return success(res, { member }, 'Card issued successfully');
});

// Get all members without issued cards and update their status
exports.getMembersWithoutCards = asyncHandler(async (req, res) => {
  // Find all members without cards
  const members = await Member.find({ issuedCard: false }).lean();

  // Update all found members to have issuedCard set to true
  if (members.length > 0) {
    // Update in database
    await Member.updateMany(
      { _id: { $in: members.map(member => member._id) } },
      { $set: { issuedCard: true } }
    );

    // Get the updated members to return in response
    const updatedMembers = await Member.find({
      _id: { $in: members.map(member => member._id) }
    }).lean();

    // Transform the data to match our API format
    const transformedMembers = updatedMembers.map(member => ({
      ...member,
      issuedCard: true // Ensure this is set in the response
    }));

    // Send response with exact format and prevent pagination
    res.set('X-No-Pagination', 'true');
    return res.status(200).json({
      success: true,
      message: 'Members retrieved and cards issued successfully',
      data: {
        members: transformedMembers
      }
    });
  }

  // Send empty response with exact format and prevent pagination
  res.set('X-No-Pagination', 'true');
  return res.status(200).json({
    success: true,
    message: 'No members found without cards',
    data: {
      members: []
    }
  });
}); 