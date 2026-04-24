# TixelERP REST API v1 Documentation

## Base URL
`https://trp.tpdemo.in/api/v1`

## Authentication
- All endpoints except `POST /auth` require a Bearer JWT token
- Token is obtained from `POST /auth` (login)
- Pass as header: `Authorization: Bearer <token>`
- Token expires in 30 days
- Token is invalidated on password change
- JWT payload contains: `sub` (user ID), `email`, `name`, `tenantId`, `tenantSlug`, `roles`

## Response Format
All responses use an envelope format:
- Success: `{ "success": true, "data": { ... } }`
- Error: `{ "error": "message" }`
- Paginated: `{ "success": true, "data": { "data": [...], "total": 42, "page": 1, "limit": 25, "totalPages": 2 } }`

## Error Codes
| Status | Meaning |
|--------|---------|
| 400 | Bad request (missing or invalid fields) |
| 401 | Unauthorized (missing, invalid, or expired token) |
| 403 | Forbidden (account inactive) |
| 404 | Not found |
| 409 | Conflict (duplicate clock-in, etc.) |
| 423 | Account locked (too many failed login attempts) |
| 429 | Rate limited |
| 500 | Internal server error |

---

## Auth

### POST /auth
Log in with email and password. Returns a JWT token and user profile.

**Auth required:** No

**Rate limit:** 10 attempts per IP per minute

**Request body:**
```json
{
  "email": "rajesh.kumar@example.com",    // string, required
  "password": "SecurePass123"              // string, required
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "clxyz123abc",
      "email": "rajesh.kumar@example.com",
      "name": "Rajesh Kumar",
      "tenantId": "tenant_001",
      "tenantSlug": "tixeltech",
      "roles": ["ADMIN", "HR_MANAGER"],
      "employee": {
        "id": "emp_001",
        "employeeId": "EMP-0042",
        "firstName": "Rajesh",
        "lastName": "Kumar",
        "designation": "Senior Engineer"
      }
    }
  }
}
```

The `employee` field is `null` if no employee record is linked to the user account.

**Error responses:**
- `401` Invalid email or password
- `403` Account is not active
- `423` Account is locked (after 5 failed attempts, locked for 30 minutes)
- `429` Too many login attempts

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"email": "rajesh.kumar@example.com", "password": "SecurePass123"}'
```

---

## Dashboard

### GET /dashboard
Returns summary metrics for the tenant: employee count, active projects, revenue, attendance, leaves, tasks, and recent notifications.

**Auth required:** Yes

**Query parameters:** None

**Response (200):**
```json
{
  "success": true,
  "data": {
    "employees": 85,
    "activeProjects": 12,
    "monthlyRevenue": 2450000,
    "pendingInvoices": 7,
    "todayAttendance": 72,
    "pendingLeaves": 3,
    "openTasks": 45,
    "recentNotifications": [
      {
        "id": "notif_001",
        "type": "LEAVE_REQUEST",
        "title": "New leave request",
        "message": "Priya Sharma requested 3 days casual leave",
        "createdAt": "2026-04-24T09:30:00.000Z"
      }
    ]
  }
}
```

`monthlyRevenue` is the sum of paid invoices for the current calendar month, in INR (paisa-free, whole numbers).

`recentNotifications` returns the 5 most recent unread notifications for the logged-in user.

**cURL:**
```bash
curl https://trp.tpdemo.in/api/v1/dashboard \
  -H "Authorization: Bearer <token>"
```

---

## Attendance

### GET /attendance
Returns the logged-in employee's attendance records for a given month.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| month | integer | current month (1-12) | Month number |
| year | integer | current year | Four-digit year |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "att_001",
      "date": "2026-04-01T00:00:00.000Z",
      "clockIn": "2026-04-01T09:02:00.000Z",
      "clockOut": "2026-04-01T18:15:00.000Z",
      "status": "PRESENT",
      "totalHours": 9.22,
      "overtime": 1.22,
      "location": "28.6139,77.2090",
      "notes": null
    }
  ]
}
```

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/attendance?month=4&year=2026" \
  -H "Authorization: Bearer <token>"
```

### POST /attendance
Clock in or clock out for the current day.

**Auth required:** Yes

**Request body:**
```json
{
  "action": "clock_in",              // string, required: "clock_in" or "clock_out"
  "latitude": 28.6139,               // number, optional
  "longitude": 77.2090,              // number, optional
  "notes": "Working from office"     // string, optional
}
```

**Response (201 for clock_in, 200 for clock_out):**
```json
{
  "success": true,
  "data": {
    "id": "att_002",
    "tenantId": "tenant_001",
    "employeeId": "emp_001",
    "date": "2026-04-24T00:00:00.000Z",
    "clockIn": "2026-04-24T09:00:00.000Z",
    "clockOut": null,
    "status": "PRESENT",
    "totalHours": null,
    "overtime": null,
    "location": "28.6139,77.2090",
    "notes": "Working from office"
  }
}
```

On `clock_out`, `totalHours` and `overtime` (hours beyond 8) are computed automatically.

**Error responses:**
- `409` Already clocked in today (for `clock_in`)
- `409` Already clocked out today (for `clock_out`)
- `400` No clock-in record found (for `clock_out` without prior `clock_in`)

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/attendance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "clock_in", "latitude": 28.6139, "longitude": 77.2090}'
```

---

## Leaves

### GET /leaves
List the logged-in employee's leave requests with pagination.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | all | Filter by status: PENDING, APPROVED, REJECTED, CANCELLED |
| page | integer | 1 | Page number |
| limit | integer | 25 | Items per page (max 100) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "leave_001",
        "tenantId": "tenant_001",
        "employeeId": "emp_001",
        "leaveTypeId": "lt_001",
        "startDate": "2026-05-01T00:00:00.000Z",
        "endDate": "2026-05-03T00:00:00.000Z",
        "days": 3,
        "reason": "Family function in Jaipur",
        "status": "PENDING",
        "createdAt": "2026-04-20T10:00:00.000Z",
        "updatedAt": "2026-04-20T10:00:00.000Z",
        "leaveType": {
          "id": "lt_001",
          "name": "Casual Leave",
          "code": "CL"
        }
      }
    ],
    "total": 8,
    "page": 1,
    "limit": 25,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/leaves?status=PENDING&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### POST /leaves
Submit a new leave request.

**Auth required:** Yes

**Request body:**
```json
{
  "leaveTypeId": "lt_001",            // string, required
  "startDate": "2026-05-01",          // string (ISO date), required
  "endDate": "2026-05-03",            // string (ISO date), required
  "reason": "Family function"         // string, optional
}
```

Days are calculated automatically (inclusive of start and end dates).

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "leave_002",
    "tenantId": "tenant_001",
    "employeeId": "emp_001",
    "leaveTypeId": "lt_001",
    "startDate": "2026-05-01T00:00:00.000Z",
    "endDate": "2026-05-03T00:00:00.000Z",
    "days": 3,
    "reason": "Family function",
    "status": "PENDING",
    "createdAt": "2026-04-24T12:00:00.000Z",
    "updatedAt": "2026-04-24T12:00:00.000Z",
    "leaveType": {
      "id": "lt_001",
      "name": "Casual Leave",
      "code": "CL"
    }
  }
}
```

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/leaves \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"leaveTypeId": "lt_001", "startDate": "2026-05-01", "endDate": "2026-05-03", "reason": "Family function"}'
```

### GET /leaves/balance
Returns the current year's leave balance for each active leave type.

**Auth required:** Yes

**Query parameters:** None

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "leaveTypeId": "lt_001",
      "leaveTypeName": "Casual Leave",
      "leaveTypeCode": "CL",
      "allowed": 12,
      "used": 4,
      "remaining": 8,
      "carryForward": false
    },
    {
      "leaveTypeId": "lt_002",
      "leaveTypeName": "Sick Leave",
      "leaveTypeCode": "SL",
      "allowed": 10,
      "used": 2,
      "remaining": 8,
      "carryForward": true
    },
    {
      "leaveTypeId": "lt_003",
      "leaveTypeName": "Earned Leave",
      "leaveTypeCode": "EL",
      "allowed": 15,
      "used": 0,
      "remaining": 15,
      "carryForward": true
    }
  ]
}
```

`used` includes both APPROVED and PENDING leave requests for the current calendar year.

**cURL:**
```bash
curl https://trp.tpdemo.in/api/v1/leaves/balance \
  -H "Authorization: Bearer <token>"
```

---

## Tasks

### GET /tasks
List tasks assigned to the logged-in employee with pagination.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | all | Filter: TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED |
| projectId | string | all | Filter by project ID |
| page | integer | 1 | Page number |
| limit | integer | 25 | Items per page (max 100) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "task_001",
        "title": "Complete API integration for attendance module",
        "description": "Integrate mobile clock-in/clock-out with backend",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "dueDate": "2026-04-30T00:00:00.000Z",
        "estimatedHours": 16,
        "actualHours": 8,
        "sortOrder": 1,
        "createdAt": "2026-04-15T09:00:00.000Z",
        "updatedAt": "2026-04-22T14:30:00.000Z",
        "project": {
          "id": "proj_001",
          "name": "Mobile ERP App",
          "code": "MOB-ERP"
        }
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 25,
    "totalPages": 1
  }
}
```

Tasks are sorted by priority (ascending) then by due date (ascending).

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/tasks?status=IN_PROGRESS&page=1" \
  -H "Authorization: Bearer <token>"
```

### PATCH /tasks
Update the status of a task assigned to the logged-in employee.

**Auth required:** Yes

**Request body:**
```json
{
  "taskId": "task_001",               // string, required
  "status": "DONE"                    // string, required: TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "task_001",
    "title": "Complete API integration for attendance module",
    "status": "DONE",
    "priority": "HIGH",
    "dueDate": "2026-04-30T00:00:00.000Z",
    "updatedAt": "2026-04-24T16:00:00.000Z",
    "project": {
      "id": "proj_001",
      "name": "Mobile ERP App",
      "code": "MOB-ERP"
    }
  }
}
```

**cURL:**
```bash
curl -X PATCH https://trp.tpdemo.in/api/v1/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"taskId": "task_001", "status": "DONE"}'
```

---

## Employees

### GET /employees
List employees for the tenant with search and filtering. Paginated.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| search | string | none | Search across firstName, lastName, email, employeeId, designation |
| departmentId | string | all | Filter by department ID |
| status | string | all | Filter by status (e.g. ACTIVE, INACTIVE) |
| page | integer | 1 | Page number |
| limit | integer | 25 | Items per page (max 100) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "emp_001",
        "employeeId": "EMP-0042",
        "firstName": "Anita",
        "lastName": "Desai",
        "email": "anita.desai@example.com",
        "phone": "+919876543210",
        "departmentId": "dept_eng",
        "designation": "Software Engineer",
        "status": "ACTIVE",
        "dateOfJoining": "2023-06-15T00:00:00.000Z",
        "employmentType": "FULL_TIME"
      }
    ],
    "total": 85,
    "page": 1,
    "limit": 25,
    "totalPages": 4
  }
}
```

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/employees?search=anita&status=ACTIVE&page=1" \
  -H "Authorization: Bearer <token>"
```

### GET /employees/:id
Get detailed information about a single employee.

**Auth required:** Yes

**Path parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Employee record ID |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "emp_001",
    "employeeId": "EMP-0042",
    "firstName": "Anita",
    "lastName": "Desai",
    "email": "anita.desai@example.com",
    "phone": "+919876543210",
    "dateOfBirth": "1995-03-12T00:00:00.000Z",
    "gender": "FEMALE",
    "maritalStatus": "SINGLE",
    "bloodGroup": "B+",
    "address": "42, Lajpat Nagar",
    "city": "New Delhi",
    "state": "Delhi",
    "pincode": "110024",
    "country": "India",
    "departmentId": "dept_eng",
    "designation": "Software Engineer",
    "reportingToId": "emp_010",
    "dateOfJoining": "2023-06-15T00:00:00.000Z",
    "dateOfLeaving": null,
    "employmentType": "FULL_TIME",
    "status": "ACTIVE",
    "createdAt": "2023-06-15T09:00:00.000Z",
    "updatedAt": "2026-04-20T11:00:00.000Z",
    "reportingTo": {
      "id": "emp_010",
      "firstName": "Suresh",
      "lastName": "Mehta",
      "employeeId": "EMP-0010"
    }
  }
}
```

**cURL:**
```bash
curl https://trp.tpdemo.in/api/v1/employees/emp_001 \
  -H "Authorization: Bearer <token>"
```

---

## Notifications

### GET /notifications
List notifications for the logged-in user. Paginated.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| unreadOnly | string | false | Set to "true" to fetch only unread notifications |
| page | integer | 1 | Page number |
| limit | integer | 25 | Items per page (max 100) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "notif_001",
        "type": "LEAVE_APPROVED",
        "title": "Leave approved",
        "message": "Your casual leave from May 1 to May 3 has been approved",
        "link": "/leaves/leave_001",
        "isRead": false,
        "readAt": null,
        "createdAt": "2026-04-24T10:00:00.000Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 25,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/notifications?unreadOnly=true" \
  -H "Authorization: Bearer <token>"
```

### PATCH /notifications
Mark one or more notifications as read.

**Auth required:** Yes

**Request body:**
```json
{
  "notificationIds": ["notif_001", "notif_002"]   // string[], required, non-empty
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "updated": 2
  }
}
```

**cURL:**
```bash
curl -X PATCH https://trp.tpdemo.in/api/v1/notifications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"notificationIds": ["notif_001", "notif_002"]}'
```

---

## Profile

### GET /profile
Returns the logged-in user's account details and linked employee record.

**Auth required:** Yes

**Query parameters:** None

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxyz123abc",
      "email": "rajesh.kumar@example.com",
      "name": "Rajesh Kumar",
      "firstName": "Rajesh",
      "lastName": "Kumar",
      "phone": "+919876543210",
      "avatar": "https://cdn.example.com/avatars/rajesh.jpg",
      "theme": "DARK",
      "locale": "en-IN",
      "timezone": "Asia/Kolkata",
      "createdAt": "2023-01-10T09:00:00.000Z",
      "lastLoginAt": "2026-04-24T08:30:00.000Z"
    },
    "employee": {
      "id": "emp_001",
      "employeeId": "EMP-0042",
      "firstName": "Rajesh",
      "lastName": "Kumar",
      "email": "rajesh.kumar@example.com",
      "phone": "+919876543210",
      "departmentId": "dept_eng",
      "designation": "Senior Engineer",
      "dateOfJoining": "2022-03-01T00:00:00.000Z",
      "employmentType": "FULL_TIME",
      "status": "ACTIVE",
      "reportingTo": {
        "id": "emp_005",
        "firstName": "Meena",
        "lastName": "Iyer",
        "employeeId": "EMP-0005"
      }
    }
  }
}
```

`employee` is `null` if no employee record is linked to the user.

**cURL:**
```bash
curl https://trp.tpdemo.in/api/v1/profile \
  -H "Authorization: Bearer <token>"
```

### PATCH /profile
Update the logged-in user's profile fields.

**Auth required:** Yes

**Request body (all fields optional):**
```json
{
  "name": "Rajesh Kumar",
  "firstName": "Rajesh",
  "lastName": "Kumar",
  "phone": "+919876543210",
  "avatar": "https://cdn.example.com/avatars/rajesh.jpg",
  "theme": "DARK",              // LIGHT, DARK, or SYSTEM
  "locale": "en-IN",
  "timezone": "Asia/Kolkata"
}
```

At least one field must be provided. Only the fields listed above can be updated.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clxyz123abc",
    "email": "rajesh.kumar@example.com",
    "name": "Rajesh Kumar",
    "firstName": "Rajesh",
    "lastName": "Kumar",
    "phone": "+919876543210",
    "avatar": "https://cdn.example.com/avatars/rajesh.jpg",
    "theme": "DARK",
    "locale": "en-IN",
    "timezone": "Asia/Kolkata"
  }
}
```

**cURL:**
```bash
curl -X PATCH https://trp.tpdemo.in/api/v1/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"theme": "DARK", "timezone": "Asia/Kolkata"}'
```

---

## Projects

### GET /projects
List all projects for the tenant. Paginated.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | all | Filter: PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED |
| page | integer | 1 | Page number |
| limit | integer | 25 | Items per page (max 100) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "proj_001",
        "name": "Delhi Metro Phase IV",
        "code": "DMRC-P4",
        "description": "Civil construction for metro line extension",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "startDate": "2025-06-01T00:00:00.000Z",
        "endDate": "2027-12-31T00:00:00.000Z",
        "budget": 50000000,
        "spent": 18500000,
        "progress": 37,
        "managerId": "emp_005",
        "clientName": "DMRC Ltd.",
        "createdAt": "2025-05-15T09:00:00.000Z",
        "updatedAt": "2026-04-22T14:00:00.000Z",
        "_count": {
          "tasks": 48
        }
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 25,
    "totalPages": 1
  }
}
```

`budget` and `spent` are in INR. `progress` is a percentage (0-100).

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/projects?status=IN_PROGRESS" \
  -H "Authorization: Bearer <token>"
```

### GET /projects/:id
Get detailed information about a single project, including milestones and task summary.

**Auth required:** Yes

**Path parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Project ID |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "proj_001",
    "name": "Delhi Metro Phase IV",
    "code": "DMRC-P4",
    "description": "Civil construction for metro line extension",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "startDate": "2025-06-01T00:00:00.000Z",
    "endDate": "2027-12-31T00:00:00.000Z",
    "budget": 50000000,
    "spent": 18500000,
    "progress": 37,
    "managerId": "emp_005",
    "clientName": "DMRC Ltd.",
    "createdAt": "2025-05-15T09:00:00.000Z",
    "updatedAt": "2026-04-22T14:00:00.000Z",
    "milestones": [
      {
        "id": "ms_001",
        "title": "Foundation work complete",
        "description": "All foundation piling and capping done",
        "dueDate": "2026-03-31T00:00:00.000Z",
        "isCompleted": true,
        "completedAt": "2026-03-28T00:00:00.000Z"
      },
      {
        "id": "ms_002",
        "title": "Superstructure Phase 1",
        "description": "Column and beam casting for stations 1-3",
        "dueDate": "2026-09-30T00:00:00.000Z",
        "isCompleted": false,
        "completedAt": null
      }
    ],
    "taskSummary": {
      "TODO": 10,
      "IN_PROGRESS": 15,
      "IN_REVIEW": 5,
      "DONE": 18,
      "BLOCKED": 0,
      "total": 48
    }
  }
}
```

**cURL:**
```bash
curl https://trp.tpdemo.in/api/v1/projects/proj_001 \
  -H "Authorization: Bearer <token>"
```

---

## Inventory

### GET /inventory
List active products with warehouse stock details. Paginated.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| search | string | none | Search across name, SKU, barcode, category |
| lowStock | string | false | Set to "true" to show only items at or below minimum stock |
| page | integer | 1 | Page number |
| limit | integer | 25 | Items per page (max 100) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "prod_001",
        "sku": "CEM-OPC-50",
        "name": "OPC Cement 50kg Bag",
        "description": "Ordinary Portland Cement, 53 Grade",
        "category": "Building Materials",
        "unit": "BAG",
        "hsnCode": "2523",
        "costPrice": 350,
        "sellingPrice": 420,
        "taxRate": 28,
        "barcode": "8901234567890",
        "minStock": 100,
        "maxStock": 5000,
        "imageUrl": null,
        "createdAt": "2025-01-10T09:00:00.000Z",
        "warehouseStock": [
          {
            "quantity": 250,
            "reservedQty": 50,
            "warehouse": {
              "id": "wh_001",
              "name": "Gurgaon Central",
              "code": "WH-GGN"
            }
          }
        ],
        "totalStock": 250
      }
    ],
    "total": 340,
    "page": 1,
    "limit": 25,
    "totalPages": 14
  }
}
```

Prices are in INR. `taxRate` is a percentage. `totalStock` is the computed sum across all warehouses.

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/inventory?search=cement&page=1" \
  -H "Authorization: Bearer <token>"
```

### POST /inventory/scan
Look up a product by barcode or SKU. Designed for barcode scanner integration.

**Auth required:** Yes

**Request body:**
```json
{
  "code": "8901234567890"    // string, required (barcode or SKU)
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "prod_001",
    "sku": "CEM-OPC-50",
    "name": "OPC Cement 50kg Bag",
    "description": "Ordinary Portland Cement, 53 Grade",
    "category": "Building Materials",
    "unit": "BAG",
    "hsnCode": "2523",
    "costPrice": 350,
    "sellingPrice": 420,
    "taxRate": 28,
    "barcode": "8901234567890",
    "minStock": 100,
    "imageUrl": null,
    "warehouseStock": [
      {
        "quantity": 250,
        "reservedQty": 50,
        "warehouse": {
          "id": "wh_001",
          "name": "Gurgaon Central",
          "code": "WH-GGN"
        }
      }
    ],
    "totalStock": 250
  }
}
```

The scan endpoint first searches by barcode, then falls back to SKU matching.

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/inventory/scan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "8901234567890"}'
```

---

## Tickets

### GET /tickets
List tickets assigned to or reported by the logged-in employee. Paginated.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | all | Filter: OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| page | integer | 1 | Page number |
| limit | integer | 25 | Items per page (max 100) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "tkt_001",
        "ticketNo": "TKT-00042",
        "subject": "AC not working in conference room B",
        "description": "The split AC unit has been making noise and not cooling since Monday.",
        "status": "OPEN",
        "priority": "HIGH",
        "category": "Facilities",
        "projectId": null,
        "reportedById": "emp_001",
        "assignedToId": "emp_015",
        "slaDeadline": "2026-04-26T18:00:00.000Z",
        "resolvedAt": null,
        "closedAt": null,
        "createdAt": "2026-04-24T09:00:00.000Z",
        "updatedAt": "2026-04-24T09:00:00.000Z",
        "project": null
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 25,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/tickets?status=OPEN" \
  -H "Authorization: Bearer <token>"
```

### POST /tickets
Create a new support ticket.

**Auth required:** Yes

**Request body:**
```json
{
  "subject": "Projector not working in Room 3",    // string, required
  "description": "The HDMI port seems damaged",    // string, optional
  "priority": "MEDIUM",                            // string, optional: LOW, MEDIUM, HIGH, URGENT (default: MEDIUM)
  "category": "IT Support",                        // string, optional
  "projectId": "proj_001"                          // string, optional
}
```

A ticket number (e.g. `TKT-00043`) is generated automatically.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "tkt_002",
    "ticketNo": "TKT-00043",
    "subject": "Projector not working in Room 3",
    "description": "The HDMI port seems damaged",
    "status": "OPEN",
    "priority": "MEDIUM",
    "category": "IT Support",
    "projectId": "proj_001",
    "reportedById": "emp_001",
    "slaDeadline": null,
    "createdAt": "2026-04-24T11:00:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/tickets \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"subject": "Projector not working in Room 3", "priority": "MEDIUM", "category": "IT Support"}'
```

---

## Tenders

### GET /tenders
List all tenders for the tenant. Paginated.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| search | string | none | Search across title, referenceNo, issuingAuth |
| status | string | all | Filter by tender status (e.g. DRAFT, PUBLISHED, SUBMITTED, WON, LOST) |
| category | string | all | Filter by category |
| page | integer | 1 | Page number |
| pageSize | integer | 25 | Items per page (max 100) |

Note: This endpoint uses `pageSize` instead of `limit`.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "tender_001",
        "tenantId": "tenant_001",
        "referenceNo": "CPWD/2026/NIT-1234",
        "title": "Construction of Government Quarter at Dwarka Sector 21",
        "description": "G+4 residential complex with 120 DUs",
        "source": "GEM",
        "sourceUrl": "https://gem.gov.in/tender/1234",
        "issuingAuth": "CPWD Delhi",
        "category": "Civil Construction",
        "status": "PUBLISHED",
        "estimatedValue": 85000000,
        "emdAmount": 1700000,
        "emdDeadline": "2026-05-10T00:00:00.000Z",
        "submissionDeadline": "2026-05-15T17:00:00.000Z",
        "openingDate": "2026-05-16T11:00:00.000Z",
        "eligibilityCriteria": "Class A contractor with 5 years experience",
        "documents": [],
        "assignedToId": "emp_005",
        "createdAt": "2026-04-20T09:00:00.000Z",
        "updatedAt": "2026-04-20T09:00:00.000Z",
        "_count": {
          "bids": 1,
          "boqItems": 24,
          "emdRecords": 1
        }
      }
    ],
    "total": 8,
    "page": 1,
    "pageSize": 25,
    "totalPages": 1
  }
}
```

Monetary values (`estimatedValue`, `emdAmount`) are in INR.

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/tenders?status=PUBLISHED&page=1" \
  -H "Authorization: Bearer <token>"
```

### POST /tenders
Create a new tender.

**Auth required:** Yes

**Request body:**
```json
{
  "referenceNo": "CPWD/2026/NIT-5678",                 // string, required
  "title": "Road Widening NH-48 Gurgaon",              // string, required
  "description": "6-lane widening from KM 20 to KM 35",// string, optional
  "source": "GEM",                                      // string, optional (default: "MANUAL")
  "sourceUrl": "https://gem.gov.in/tender/5678",        // string, optional
  "issuingAuth": "NHAI",                                // string, optional
  "category": "Road Construction",                      // string, optional
  "estimatedValue": 120000000,                          // number, optional (INR)
  "emdAmount": 2400000,                                 // number, optional (INR)
  "emdDeadline": "2026-06-01",                          // string (ISO date), optional
  "submissionDeadline": "2026-06-05T17:00:00.000Z",     // string (ISO datetime), optional
  "openingDate": "2026-06-06",                          // string (ISO date), optional
  "assignedToId": "emp_005",                            // string, optional
  "eligibilityCriteria": "Class A contractor",          // string, optional
  "documents": []                                       // array, optional
}
```

**Response (201):**
Returns the full created tender object.

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/tenders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"referenceNo": "CPWD/2026/NIT-5678", "title": "Road Widening NH-48 Gurgaon", "estimatedValue": 120000000}'
```

### GET /tenders/:id
Get a single tender with its bids, BOQ items, and EMD records.

**Auth required:** Yes

**Path parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Tender ID |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "tender_001",
    "referenceNo": "CPWD/2026/NIT-1234",
    "title": "Construction of Government Quarter at Dwarka Sector 21",
    "status": "PUBLISHED",
    "estimatedValue": 85000000,
    "bids": [ ... ],
    "boqItems": [ ... ],
    "emdRecords": [ ... ]
  }
}
```

The response includes the full tender object plus nested arrays of related `bids` (newest first), `boqItems` (sorted by sNo), and `emdRecords` (newest first).

**cURL:**
```bash
curl https://trp.tpdemo.in/api/v1/tenders/tender_001 \
  -H "Authorization: Bearer <token>"
```

### PATCH /tenders/:id
Update a tender's fields.

**Auth required:** Yes

**Path parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Tender ID |

**Request body:** Any tender fields to update (same fields as POST, all optional).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "updated": true
  }
}
```

**cURL:**
```bash
curl -X PATCH https://trp.tpdemo.in/api/v1/tenders/tender_001 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "SUBMITTED"}'
```

### DELETE /tenders/:id
Delete a tender.

**Auth required:** Yes

**Path parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Tender ID |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

**cURL:**
```bash
curl -X DELETE https://trp.tpdemo.in/api/v1/tenders/tender_001 \
  -H "Authorization: Bearer <token>"
```

---

## Bids

### GET /tenders/:id/bids
List all bids for a specific tender. Paginated.

**Auth required:** Yes

**Path parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Tender ID |

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | integer | 1 | Page number |
| pageSize | integer | 25 | Items per page (max 100) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "bid_001",
        "tenantId": "tenant_001",
        "tenderId": "tender_001",
        "bidNo": "BID-2026-001",
        "bidAmount": 82500000,
        "status": "DRAFT",
        "documents": [],
        "keywords": [],
        "createdAt": "2026-04-22T10:00:00.000Z",
        "updatedAt": "2026-04-22T10:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 25,
    "totalPages": 1
  }
}
```

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/tenders/tender_001/bids" \
  -H "Authorization: Bearer <token>"
```

### POST /tenders/:id/bids
Create a new bid for a tender.

**Auth required:** Yes

**Path parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Tender ID |

**Request body:**
```json
{
  "bidNo": "BID-2026-002",      // string, required
  "bidAmount": 78000000,         // number, required (INR)
  "status": "DRAFT",            // string, optional (default: "DRAFT")
  "documents": [],               // array, optional
  "keywords": ["civil", "road"] // string[], optional
}
```

**Response (201):**
Returns the full created bid object.

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/tenders/tender_001/bids \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bidNo": "BID-2026-002", "bidAmount": 78000000}'
```

---

## BOQ (Bill of Quantities)

### GET /tenders/:id/boq
List all BOQ items for a tender, sorted by serial number.

**Auth required:** Yes

**Path parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Tender ID |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "boq_001",
      "tenantId": "tenant_001",
      "tenderId": "tender_001",
      "sNo": 1,
      "description": "Earth excavation in foundation",
      "unit": "CUM",
      "quantity": 5000,
      "rate": 250,
      "amount": 1250000,
      "category": "Civil Work",
      "remarks": null,
      "sourceDoc": "NIT-1234-BOQ.pdf",
      "createdAt": "2026-04-21T09:00:00.000Z",
      "updatedAt": "2026-04-21T09:00:00.000Z"
    }
  ]
}
```

BOQ items are not paginated. They are returned as a flat array sorted by `sNo`.

**cURL:**
```bash
curl https://trp.tpdemo.in/api/v1/tenders/tender_001/boq \
  -H "Authorization: Bearer <token>"
```

### POST /tenders/:id/boq
Add a BOQ item to a tender.

**Auth required:** Yes

**Path parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Tender ID |

**Request body:**
```json
{
  "sNo": 2,                                          // integer, required
  "description": "RCC M25 grade for foundations",     // string, required
  "unit": "CUM",                                     // string, required
  "quantity": 1200,                                   // number, required
  "rate": 6500,                                       // number, optional (INR per unit)
  "amount": 7800000,                                  // number, optional (INR total)
  "category": "Civil Work",                           // string, optional
  "remarks": "As per IS 456:2000",                    // string, optional
  "sourceDoc": "NIT-1234-BOQ.pdf"                     // string, optional
}
```

**Response (201):**
Returns the full created BOQ item object.

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/tenders/tender_001/boq \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sNo": 2, "description": "RCC M25 grade for foundations", "unit": "CUM", "quantity": 1200, "rate": 6500}'
```

---

## EMD (Earnest Money Deposit)

### GET /emd
List EMD records for the tenant. Filtered by status, with optional expiry window.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | ACTIVE | Filter by status |
| expiringDays | integer | none | Show EMDs expiring within this many days from today |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "emd_001",
      "tenantId": "tenant_001",
      "tenderId": "tender_001",
      "type": "EMD",
      "instrumentType": "BG",
      "instrumentNo": "BG/2026/SBIN/00456",
      "bankName": "State Bank of India",
      "amount": 1700000,
      "issuedDate": "2026-04-20T00:00:00.000Z",
      "expiryDate": "2026-10-20T00:00:00.000Z",
      "status": "ACTIVE",
      "remarks": null,
      "createdAt": "2026-04-20T10:00:00.000Z",
      "updatedAt": "2026-04-20T10:00:00.000Z",
      "tender": {
        "id": "tender_001",
        "title": "Construction of Government Quarter at Dwarka Sector 21",
        "referenceNo": "CPWD/2026/NIT-1234"
      }
    }
  ]
}
```

EMD records are not paginated. They are returned sorted by `expiryDate` ascending (soonest expiry first).

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/emd?status=ACTIVE&expiringDays=30" \
  -H "Authorization: Bearer <token>"
```

### POST /emd
Create a new EMD record.

**Auth required:** Yes

**Request body:**
```json
{
  "tenderId": "tender_001",                    // string, optional
  "type": "EMD",                               // string, optional (default: "EMD")
  "instrumentType": "BG",                      // string, optional (default: "BG"), e.g. BG, FDR, DD
  "instrumentNo": "BG/2026/SBIN/00456",        // string, optional
  "bankName": "State Bank of India",           // string, optional
  "amount": 1700000,                           // number, required (INR)
  "issuedDate": "2026-04-20",                  // string (ISO date), optional
  "expiryDate": "2026-10-20",                  // string (ISO date), optional
  "remarks": "Valid for 6 months"              // string, optional
}
```

**Response (201):**
Returns the full created EMD record object.

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/emd \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"tenderId": "tender_001", "amount": 1700000, "bankName": "State Bank of India", "instrumentNo": "BG/2026/SBIN/00456"}'
```

---

## CV Bank

### GET /cv-bank
List CV records for the tenant. Paginated.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| search | string | none | Search across name, email, designation, qualifications |
| designation | string | all | Exact match on designation |
| department | string | all | Exact match on department |
| page | integer | 1 | Page number |
| pageSize | integer | 25 | Items per page (max 100) |

Note: This endpoint uses `pageSize` instead of `limit`.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "cv_001",
        "tenantId": "tenant_001",
        "name": "Vikram Singh",
        "email": "vikram.singh@example.com",
        "phone": "+919876501234",
        "employeeId": "emp_020",
        "designation": "Site Engineer",
        "department": "Civil Engineering",
        "qualifications": "B.Tech Civil, M.Tech Structural",
        "experience": 8,
        "skills": ["AutoCAD", "Revit", "Primavera P6"],
        "certifications": ["PMP", "LEED AP"],
        "projects": ["Delhi Metro Phase III", "Dwarka Expressway"],
        "cvFileUrl": "https://cdn.example.com/cvs/vikram-cv.pdf",
        "keywords": ["civil", "structural", "metro"],
        "isActive": true,
        "createdAt": "2026-01-15T09:00:00.000Z",
        "updatedAt": "2026-04-10T11:00:00.000Z"
      }
    ],
    "total": 120,
    "page": 1,
    "pageSize": 25,
    "totalPages": 5
  }
}
```

**cURL:**
```bash
curl "https://trp.tpdemo.in/api/v1/cv-bank?search=civil&page=1" \
  -H "Authorization: Bearer <token>"
```

### POST /cv-bank
Add a new CV record.

**Auth required:** Yes

**Request body:**
```json
{
  "name": "Neha Gupta",                          // string, required
  "email": "neha.gupta@example.com",             // string, optional
  "phone": "+919876509876",                      // string, optional
  "employeeId": "emp_030",                       // string, optional
  "designation": "Project Manager",              // string, optional
  "department": "PMO",                           // string, optional
  "qualifications": "MBA, B.Tech Civil",         // string, optional
  "experience": 12,                              // number, optional (years)
  "skills": ["MS Project", "Primavera", "SAP"],  // string[], optional
  "certifications": ["PMP", "PRINCE2"],          // string[], optional
  "projects": ["Navi Mumbai Airport"],           // string[], optional
  "cvFileUrl": "https://cdn.example.com/cv.pdf", // string, optional
  "keywords": ["pmo", "airport", "infra"]        // string[], optional
}
```

**Response (201):**
Returns the full created CV record object.

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/cv-bank \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Neha Gupta", "designation": "Project Manager", "experience": 12}'
```

### POST /cv-bank/search
Search CVs by keywords, skills, and certifications. Results are scored and ranked by relevance.

**Auth required:** Yes

**Request body (provide at least one of keywords, skills, or certifications):**
```json
{
  "keywords": ["metro", "structural"],     // string[], optional
  "skills": ["AutoCAD", "Revit"],          // string[], optional
  "certifications": ["PMP"],              // string[], optional
  "minExperience": 5                       // number, optional (minimum years)
}
```

Scoring: each keyword match = 1 point, each skill match = 2 points, each certification match = 2 points. Only CVs with a score > 0 are returned.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cv_001",
      "name": "Vikram Singh",
      "designation": "Site Engineer",
      "experience": 8,
      "skills": ["AutoCAD", "Revit", "Primavera P6"],
      "certifications": ["PMP", "LEED AP"],
      "matchScore": 7
    }
  ]
}
```

Results are sorted by `matchScore` descending (best matches first). Not paginated.

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/cv-bank/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["metro"], "skills": ["AutoCAD"], "minExperience": 5}'
```

---

## Onboarding

### GET /onboarding/industries
List all active industry templates, grouped by industry name.

**Auth required:** Yes

**Query parameters:** None

**Response (200):**
```json
{
  "success": true,
  "data": {
    "Construction": [
      {
        "id": "tmpl_001",
        "industry": "Construction",
        "displayName": "Infrastructure & Civil Works",
        "description": "Template for civil construction companies",
        "isActive": true,
        "sortOrder": 1
      }
    ],
    "Manufacturing": [
      {
        "id": "tmpl_010",
        "industry": "Manufacturing",
        "displayName": "Discrete Manufacturing",
        "description": "Template for assembly and fabrication units",
        "isActive": true,
        "sortOrder": 1
      }
    ]
  }
}
```

**cURL:**
```bash
curl https://trp.tpdemo.in/api/v1/onboarding/industries \
  -H "Authorization: Bearer <token>"
```

### POST /onboarding/apply
Apply an industry template to the tenant. This provisions default departments, leave types, roles, etc.

**Auth required:** Yes

**Request body:**
```json
{
  "templateId": "tmpl_001"     // string, required
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "departmentsCreated": 8,
    "rolesCreated": 5,
    "leaveTypesCreated": 4,
    "workflowsCreated": 3
  }
}
```

The exact shape of the response depends on the template's provisioning logic.

**cURL:**
```bash
curl -X POST https://trp.tpdemo.in/api/v1/onboarding/apply \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"templateId": "tmpl_001"}'
```
