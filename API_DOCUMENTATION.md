# ERA Hub Check-in API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## Member Management

### POST /members/register
Register a new member and generate QR code.

**Body:**
```json
{
  "fullName": "string",
  "gender": "male|female|other",
  "phone": "string",
  "email": "string",
  "dateOfBirth": "date",
  "department": "string",
  "membershipType": "basic|premium|vip"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Member registered successfully",
  "data": {
    "member": {
      "memberId": "string",
      "qrCodeUrl": "string",
      ...
    }
  }
}
```

### POST /members/check-in
Check in a member using QR code.

**Body:**
```json
{
  "memberId": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "attendance": {
      "member": "string",
      "checkIn": "datetime",
      "status": "checked-in"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - If member is already checked in
- `404 Not Found` - If member is not found

### POST /members/check-out
Check out a member using QR code.

**Body:**
```json
{
  "memberId": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Check-out successful",
  "data": {
    "attendance": {
      "member": "string",
      "checkIn": "datetime",
      "checkOut": "datetime",
      "duration": "number",  // Duration in minutes
      "status": "checked-out"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - If member is not checked in
- `404 Not Found` - If member is not found or no active attendance record exists

### POST /attendance/manual-check-in
Manually check in a member (Admin/Superadmin only).

**Body:**
```json
{
  "memberId": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Manual check-in successful",
  "data": {
    "attendance": {
      "member": "string",
      "checkIn": "datetime",
      "status": "checked-in"
    }
  }
}
```

### POST /attendance/manual-check-out
Manually check out a member (Admin/Superadmin only).

**Body:**
```json
{
  "memberId": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Manual check-out successful",
  "data": {
    "attendance": {
      "member": "string",
      "checkIn": "datetime",
      "checkOut": "datetime",
      "duration": "number",  // Duration in minutes
      "status": "checked-out"
    }
  }
}
```

## Authentication

### POST /auth/login
Login for admin users.

**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "admin": {
      "email": "string",
      "fullName": "string",
      "role": "admin|superadmin",
      ...
    }
  }
}
```

### POST /auth/forgot-password
Request password reset.

**Body:**
```json
{
  "email": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Reset token generated successfully",
  "data": {
    "resetToken": "string"
  }
}
```

### POST /auth/reset-password/:token
Reset password using token.

**Body:**
```json
{
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "admin": {...}
  }
}
```

## Admin Dashboard

### GET /admin/dashboard
Get overview statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "members": {
        "total": "number",
        "active": "number",
        "present": "number",
        "membershipTypes": [...]
      },
      "attendance": {
        "today": "number",
        "week": "number",
        "month": "number",
        "avgDuration": "number"
      }
    }
  }
}
```

### GET /admin/dashboard/today
Get today's statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalCheckins": "number",
      "currentlyPresent": "number",
      "avgDuration": "number",
      "hourlyDistribution": [...]
    }
  }
}
```

### GET /admin/live/present
Get currently present members.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "members": [{
      "memberId": "string",
      "fullName": "string",
      "email": "string",
      "lastCheckIn": "datetime",
      ...
    }]
  }
}
```

## Attendance Management

### GET /attendance
Get all attendance records with pagination.

**Query Parameters:**
- page (number, default: 1)
- limit (number, default: 10)
- status (string, optional)
- memberId (string, optional)

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number",
    "hasNextPage": "boolean",
    "hasPrevPage": "boolean"
  }
}
```

### GET /attendance/member/:memberId
Get attendance history for a specific member.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "attendance": [...]
  }
}
```

### GET /attendance/export
Export attendance data.

**Query Parameters:**
- startDate (date, optional)
- endDate (date, optional)
- format (string, default: 'csv')

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [...],
    "format": "csv"
  }
}
```

## Analytics

### GET /admin/reports/analytics
Get analytics report.

**Query Parameters:**
```
period: string (week|month|year)
startDate: string (YYYY-MM-DD)
endDate: string (YYYY-MM-DD)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "dailyTrends": [
        {
          "date": "2024-03-14T00:00:00.000Z",
          "total": 25
        }
      ],
      "departmentDistribution": [
        {
          "department": "ERA OPENLABS",
          "count": 30
        }
      ]
    }
  }
}
```

### GET /admin/reports/analytics/top-active
Get most active members based on check-in frequency.

**Query Parameters:**
```
period: string (week|month|year) - default: month
limit: number - default: 10
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "memberId": "string",
        "fullName": "string",
        "department": "string",
        "checkInCount": "number",
        "lastCheckIn": "datetime"
      }
    ]
  }
}
```

### GET /admin/reports/analytics/inactive
Get inactive members who haven't checked in for a specified number of days.

**Query Parameters:**
```
days: number - default: 21
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "memberId": "string",
        "fullName": "string",
        "department": "string",
        "lastCheckIn": "datetime",
        "inactiveDays": "number"
      }
    ]
  }
}
```

### GET /attendance/heatmap
Get attendance heatmap data.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "heatmap": [{
      "_id": {
        "dayOfWeek": "number",
        "hour": "number"
      },
      "count": "number"
    }]
  }
}
```

## Member Search

### GET /admin/search/members
Search members.

**Query Parameters:**
- query (string, optional)
- status (string, optional)
- membershipType (string, optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "members": [...]
  }
}
```

### GET /admin/search/attendance
Search attendance records.

**Query Parameters:**
- memberId (string, optional)
- startDate (date, optional)
- endDate (date, optional)
- status (string, optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "attendance": [...]
  }
}
```

## Card Management

### GET /api/members/without-cards
Get all members who haven't been issued cards yet and automatically issue cards to them (Admin/Superadmin only).

This endpoint will:
1. Find all members without cards (issuedCard: false)
2. Automatically update their status to issued (issuedCard: true)
3. Return the updated list of members

**Response (200):**
```json
{
  "success": true,
  "message": "Members retrieved and cards issued successfully",
  "data": {
    "members": [{
      "memberId": "string",
      "fullName": "string",
      "email": "string",
      "issuedCard": true,
      "department": "string",
      "membershipType": "string",
      "status": "string",
      "dateJoined": "date",
      // ... other member fields
    }]
  }
}
```

**Empty Response (200):**
```json
{
  "success": true,
  "message": "No members found without cards",
  "data": {
    "members": []
  }
}
```

### POST /api/members/card/issue
Issue a card to a specific member (Admin/Superadmin only).

**Request Body:**
```json
{
  "memberId": "string" // Required - The ID of the member to issue a card to
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Card issued successfully",
  "data": {
    "member": {
      "memberId": "string",
      "fullName": "string",
      "email": "string",
      "issuedCard": true,
      "department": "string",
      "membershipType": "string",
      "status": "string",
      "dateJoined": "date",
      // ... other member fields
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - If memberId is missing or invalid
- `404 Not Found` - If member is not found
- `400 Bad Request` - If card has already been issued to this member

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Error description"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "You are not logged in. Please log in to get access."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```