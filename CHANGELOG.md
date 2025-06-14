# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-03-19

### Added
- Initial release of the ERA Hub Check-in API
- Member registration with QR code generation
- QR code-based check-in/check-out system
- Admin authentication with JWT
- Role-based access control (admin, superadmin)
- Member management endpoints
- Attendance tracking and logging
- Real-time presence monitoring
- Analytics and reporting features
- Export functionality for attendance data
- Search functionality for members and attendance
- Dashboard with statistics and analytics
- Comprehensive API documentation

### Features
- Member Management
  - Registration with validation
  - QR code generation
  - Profile management
  - Status tracking

- Authentication
  - JWT-based authentication
  - Password hashing
  - Password reset functionality
  - Role-based access control

- Attendance System
  - QR code check-in/check-out
  - Geolocation tracking
  - Duration calculation
  - Real-time status updates

- Admin Dashboard
  - Overview statistics
  - Daily/weekly/monthly reports
  - Member activity monitoring
  - Analytics visualization data

- Analytics
  - Attendance trends
  - Peak hours analysis
  - Member engagement metrics
  - Custom date range reports

- Export Features
  - CSV export for attendance
  - Member reports
  - Custom date range selection

### Technical Details
- Node.js and Express.js backend
- MongoDB database with Mongoose ODM
- JWT for authentication
- QR code generation and handling
- Geolocation support
- Aggregation pipelines for analytics
- Error handling middleware
- Response standardization
- Input validation
- Security features (helmet, rate limiting)

### Security
- Password hashing with bcrypt
- JWT token authentication
- Rate limiting on API endpoints
- Secure headers with helmet
- Role-based access control
- Input validation and sanitization

### Dependencies
- express: Web framework
- mongoose: MongoDB ODM
- jsonwebtoken: JWT authentication
- bcryptjs: Password hashing
- qrcode: QR code generation
- dayjs: Date manipulation
- express-async-handler: Async error handling
- helmet: Security headers
- cors: Cross-origin resource sharing
- morgan: HTTP request logging 