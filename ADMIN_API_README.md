# Admin API Documentation

This document describes the admin API endpoints for the WhatsApp Thrift Bot system.

## Base URL
```
/api/admin
```

## Authentication

All admin endpoints (except login) require authentication using a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/login
Login to the admin system.

**Request Body:**
```json
{
  "email": "admin@thriftbot.com",
  "password": "admin123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "admin": {
    "id": "admin-id",
    "name": "Super Admin",
    "email": "admin@thriftbot.com",
    "role": "super_admin",
    "permissions": ["users", "groups", "transactions", "reports", "settings", "messaging"]
  }
}
```

#### POST /auth/logout
Logout from the admin system.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /auth/me
Get current admin profile.

**Response:**
```json
{
  "success": true,
  "admin": {
    "id": "admin-id",
    "name": "Super Admin",
    "email": "admin@thriftbot.com",
    "role": "super_admin",
    "permissions": ["users", "groups", "transactions", "reports", "settings", "messaging"],
    "isActive": true,
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
```

### Dashboard

#### GET /dashboard/metrics
Get dashboard metrics and statistics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "users": {
      "total": 150,
      "active": 142,
      "growth": "15.2"
    },
    "groups": {
      "total": 25,
      "active": 23,
      "growth": "8.5"
    },
    "contributions": {
      "weekly": {
        "amount": 2500000,
        "count": 125,
        "growth": "12.3"
      },
      "monthly": {
        "amount": 10000000,
        "count": 500,
        "growth": "18.7"
      }
    },
    "pendingPayouts": 15,
    "totalTransactions": 1250
  }
}
```

#### GET /dashboard/analytics
Get analytics data for charts and trends.

**Query Parameters:**
- `period` (optional): Time period (e.g., "30d", "7d", "90d")

**Response:**
```json
{
  "success": true,
  "analytics": {
    "contributionTrends": [
      {
        "_id": { "date": "2024-01-01" },
        "amount": 500000,
        "count": 25
      }
    ],
    "userRegistrations": [
      {
        "_id": { "date": "2024-01-01" },
        "count": 5
      }
    ],
    "payoutStats": [
      {
        "_id": { "date": "2024-01-01" },
        "amount": 300000,
        "count": 3
      }
    ],
    "topGroups": [
      {
        "name": "Office Savings",
        "contributionAmount": 50000,
        "membersCount": 10,
        "totalContributed": 2500000
      }
    ]
  }
}
```

#### GET /dashboard/activity
Get recent system activity.

**Query Parameters:**
- `limit` (optional): Number of activities to return (default: 20)

**Response:**
```json
{
  "success": true,
  "activity": [
    {
      "type": "user_registration",
      "message": "John Doe registered",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "data": {
        "userId": "user-id",
        "name": "John Doe"
      }
    }
  ]
}
```

### User Management

#### GET /users
Get list of users with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term for name, email, or phone
- `status` (optional): Filter by status ("active" or "inactive")
- `sortBy` (optional): Sort field (default: "createdAt")
- `sortOrder` (optional): Sort order "asc" or "desc" (default: "desc")

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com",
      "whatsappId": "2347012345678",
      "phoneNumber": "+2347012345678",
      "balance": 50000,
      "groupsCount": 2,
      "isActive": true,
      "registeredAt": "2024-01-01T00:00:00.000Z",
      "lastActivity": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 8,
    "total": 150,
    "limit": 20
  }
}
```

#### GET /users/:id
Get detailed user information.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "whatsappId": "2347012345678",
    "phoneNumber": "+2347012345678",
    "balance": 50000,
    "groups": [
      {
        "id": "group-id",
        "name": "Office Savings"
      }
    ],
    "contributions": [
      {
        "id": "contribution-id",
        "amount": 50000,
        "status": "confirmed",
        "group": {
          "id": "group-id",
          "name": "Office Savings"
        }
      }
    ],
    "transactions": [],
    "rotations": []
  }
}
```

#### PUT /users/:id
Update user information.

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "johnsmith@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "name": "John Smith",
    "email": "johnsmith@example.com"
  }
}
```

#### POST /users/:id/activate
Activate a user account.

**Response:**
```json
{
  "success": true,
  "message": "User activated successfully"
}
```

#### POST /users/:id/deactivate
Deactivate a user account.

**Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

#### GET /users/export
Export users data for CSV download.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "Name": "John Doe",
      "Email": "john@example.com",
      "Phone": "+2347012345678",
      "WhatsAppID": "2347012345678",
      "Balance": 50000,
      "Groups": "Office Savings; Family Fund",
      "Status": "Active",
      "RegisteredAt": "2024-01-01T00:00:00.000Z",
      "LastActivity": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Group Management

#### GET /groups
Get list of groups with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term for group name
- `status` (optional): Filter by status ("active" or "inactive")
- `sortBy` (optional): Sort field (default: "createdAt")
- `sortOrder` (optional): Sort order "asc" or "desc" (default: "desc")

**Response:**
```json
{
  "success": true,
  "groups": [
    {
      "id": "group-id",
      "name": "Office Savings",
      "creator": {
        "id": "creator-id",
        "name": "Jane Doe"
      },
      "contributionAmount": 50000,
      "maxMembers": 20,
      "membersCount": 15,
      "currentCycle": 3,
      "totalContributions": 2250000,
      "isActive": true,
      "startDate": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 3,
    "total": 25,
    "limit": 20
  }
}
```

#### GET /groups/:id
Get detailed group information.

**Response:**
```json
{
  "success": true,
  "group": {
    "id": "group-id",
    "name": "Office Savings",
    "description": "Weekly savings group for office staff",
    "contributionAmount": 50000,
    "frequency": "weekly",
    "maxMembers": 20,
    "members": [
      {
        "user": {
          "id": "user-id",
          "name": "John Doe",
          "email": "john@example.com",
          "whatsappId": "2347012345678"
        },
        "joinedAt": "2024-01-01T00:00:00.000Z",
        "isActive": true
      }
    ],
    "creator": {
      "id": "creator-id",
      "name": "Jane Doe",
      "email": "jane@example.com"
    },
    "currentCycle": 3,
    "startDate": "2024-01-01T00:00:00.000Z",
    "isActive": true,
    "totalContributions": 2250000,
    "contributions": [],
    "rotations": []
  }
}
```

#### GET /groups/:id/members
Get group members with contribution statistics.

**Response:**
```json
{
  "success": true,
  "members": [
    {
      "user": {
        "id": "user-id",
        "name": "John Doe",
        "email": "john@example.com",
        "whatsappId": "2347012345678",
        "balance": 50000
      },
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "isActive": true,
      "stats": {
        "totalContributions": 15,
        "totalAmount": 750000,
        "confirmedContributions": 15
      }
    }
  ]
}
```

#### PUT /groups/:id
Update group information.

**Request Body:**
```json
{
  "name": "Office Savings Group",
  "description": "Updated description",
  "contributionAmount": 60000,
  "maxMembers": 25
}
```

**Response:**
```json
{
  "success": true,
  "group": {
    "id": "group-id",
    "name": "Office Savings Group",
    "description": "Updated description"
  }
}
```

#### POST /groups/:id/activate
Activate a group.

**Response:**
```json
{
  "success": true,
  "message": "Group activated successfully"
}
```

#### POST /groups/:id/deactivate
Deactivate a group.

**Response:**
```json
{
  "success": true,
  "message": "Group deactivated successfully"
}
```

### Transaction Management

#### GET /transactions
Get list of transactions with filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Transaction type
- `status` (optional): Transaction status
- `startDate` (optional): Start date for filtering
- `endDate` (optional): End date for filtering
- `userId` (optional): Filter by user ID
- `groupId` (optional): Filter by group ID

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "transaction-id",
      "user": {
        "id": "user-id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "group": {
        "id": "group-id",
        "name": "Office Savings"
      },
      "amount": 50000,
      "type": "contribution",
      "status": "completed",
      "reference": "TXN123456",
      "description": "Weekly contribution",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 63,
    "total": 1250,
    "limit": 20
  }
}
```

#### GET /transactions/:id
Get detailed transaction information.

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "transaction-id",
    "user": {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com",
      "whatsappId": "2347012345678"
    },
    "group": {
      "id": "group-id",
      "name": "Office Savings",
      "contributionAmount": 50000
    },
    "amount": 50000,
    "type": "contribution",
    "status": "completed",
    "reference": "TXN123456",
    "description": "Weekly contribution",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /transactions/:id/status
Update transaction status.

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Payment confirmed via bank transfer"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "transaction-id",
    "status": "completed",
    "metadata": {
      "adminNotes": "Payment confirmed via bank transfer"
    },
    "completedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET /transactions/export
Export transactions data for CSV download.

**Query Parameters:**
- `startDate` (optional): Start date for filtering
- `endDate` (optional): End date for filtering
- `type` (optional): Transaction type
- `status` (optional): Transaction status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "Reference": "TXN123456",
      "User": "John Doe",
      "UserEmail": "john@example.com",
      "Group": "Office Savings",
      "Amount": 50000,
      "Type": "contribution",
      "Status": "completed",
      "Description": "Weekly contribution",
      "CreatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Reports

#### GET /reports/financial
Get financial report.

**Query Parameters:**
- `startDate` (optional): Start date for report period
- `endDate` (optional): End date for report period

**Response:**
```json
{
  "success": true,
  "report": {
    "contributions": {
      "total": 25000000,
      "count": 500
    },
    "payouts": {
      "total": 20000000,
      "count": 400
    },
    "transactionStats": [
      {
        "_id": "completed",
        "count": 1000,
        "amount": 50000000
      },
      {
        "_id": "pending",
        "count": 200,
        "amount": 10000000
      }
    ],
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }
}
```

#### GET /reports/users
Get user activity report.

**Query Parameters:**
- `startDate` (optional): Start date for report period
- `endDate` (optional): End date for report period

**Response:**
```json
{
  "success": true,
  "report": {
    "registrationStats": [
      {
        "_id": "2024-01",
        "count": 25
      }
    ],
    "activityStats": {
      "totalUsers": 150,
      "activeUsers": 142,
      "avgBalance": 45000
    },
    "topUsers": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "totalContributions": 750000,
        "contributionsCount": 15
      }
    ],
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }
}
```

#### GET /reports/groups
Get group performance report.

**Query Parameters:**
- `startDate` (optional): Start date for report period
- `endDate` (optional): End date for report period

**Response:**
```json
{
  "success": true,
  "report": {
    "groupStats": {
      "totalGroups": 25,
      "activeGroups": 23,
      "avgContributionAmount": 45000,
      "avgMembersPerGroup": 12
    },
    "performanceStats": [
      {
        "name": "Office Savings",
        "contributionAmount": 50000,
        "membersCount": 15,
        "totalContributed": 2250000,
        "contributionRate": 0.95,
        "currentCycle": 3
      }
    ],
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }
}
```

### Messaging

#### POST /messages/broadcast
Send broadcast message to users or groups.

**Request Body:**
```json
{
  "message": "Important announcement: Group meeting tomorrow at 2 PM",
  "type": "groups",
  "groupIds": ["group-id-1", "group-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Broadcast sent",
  "stats": {
    "total": 30,
    "successful": 28,
    "failed": 2
  }
}
```

#### GET /messages/templates
Get message templates.

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": 1,
      "name": "Welcome Message",
      "content": "Welcome to {group_name}! Your weekly contribution is ₦{amount}.",
      "variables": ["group_name", "amount"]
    }
  ]
}
```

#### POST /messages/templates
Create new message template.

**Request Body:**
```json
{
  "name": "Payment Reminder",
  "content": "Hi {user_name}, reminder to make your contribution of ₦{amount} to {group_name}.",
  "variables": ["user_name", "amount", "group_name"]
}
```

**Response:**
```json
{
  "success": true,
  "template": {
    "id": 1704067200000,
    "name": "Payment Reminder",
    "content": "Hi {user_name}, reminder to make your contribution of ₦{amount} to {group_name}.",
    "variables": ["user_name", "amount", "group_name"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Settings

#### GET /settings
Get system settings.

**Response:**
```json
{
  "success": true,
  "settings": {
    "bot": {
      "name": "Thrift Bot",
      "description": "WhatsApp Thrift Management Bot",
      "version": "1.0.0"
    },
    "whatsapp": {
      "phoneNumberId": "phone-number-id",
      "verifyToken": "***hidden***",
      "webhookUrl": "https://example.com/webhook"
    },
    "payment": {
      "provider": "paystack",
      "currency": "NGN",
      "minimumAmount": 1000,
      "maximumAmount": 1000000
    },
    "business": {
      "minimumGroupSize": 2,
      "maximumGroupSize": 50,
      "defaultContributionFrequency": "weekly",
      "latePenaltyPercentage": 5,
      "allowPartialPayments": false
    },
    "notifications": {
      "enableEmailNotifications": true,
      "enableSMSBackup": false,
      "reminderFrequency": "daily"
    }
  }
}
```

#### PUT /settings
Update system settings.

**Request Body:**
```json
{
  "business": {
    "maximumGroupSize": 60,
    "latePenaltyPercentage": 10
  },
  "notifications": {
    "reminderFrequency": "weekly"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "settings": {
    "business": {
      "maximumGroupSize": 60,
      "latePenaltyPercentage": 10
    },
    "notifications": {
      "reminderFrequency": "weekly"
    }
  }
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Permissions

The admin system uses role-based access control:

- **super_admin**: Has access to all endpoints
- **admin**: Has access based on assigned permissions
- **manager**: Has limited access based on assigned permissions

Permissions include:
- `users` - User management
- `groups` - Group management
- `transactions` - Transaction management
- `reports` - Report generation
- `settings` - System settings
- `messaging` - Broadcast messaging

## Rate Limiting

Admin endpoints are subject to rate limiting:
- 100 requests per 15 minutes per IP address

## Security

- All admin endpoints (except login) require JWT authentication
- Passwords are hashed using bcrypt
- JWT tokens expire after 24 hours
- Admin accounts can be deactivated
- Sensitive operations are logged
