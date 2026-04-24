export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "TixelERP API",
    version: "1.0.0",
    description:
      "REST API for TixelERP mobile and third-party integrations. All endpoints (except /auth) require a Bearer JWT token in the Authorization header. Responses follow a consistent envelope: `{ success: true, data: ... }` on success, `{ error: \"message\" }` on failure.",
    contact: {
      name: "TixelTech Support",
      email: "support@tixeltech.com",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "API v1",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication and token management" },
    { name: "Dashboard", description: "Dashboard summary statistics" },
    { name: "Attendance", description: "Attendance tracking with GPS" },
    { name: "Leaves", description: "Leave requests and balances" },
    { name: "Tasks", description: "Task management" },
    { name: "Employees", description: "Employee directory" },
    { name: "Notifications", description: "User notifications" },
    { name: "Profile", description: "Current user profile" },
    { name: "Projects", description: "Project management" },
    { name: "Inventory", description: "Product inventory and barcode scanning" },
    { name: "Tickets", description: "Support ticket management" },
    { name: "Tenders", description: "Tender and procurement management" },
    { name: "Bids", description: "Bid submissions against tenders" },
    { name: "BOQ", description: "Bill of Quantities for tenders" },
    { name: "EMD", description: "Earnest Money Deposit tracking" },
    { name: "CV Bank", description: "CV and personnel resource bank" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "JWT token obtained from POST /auth. Pass as `Authorization: Bearer <token>`.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "Unauthorized" },
        },
        required: ["error"],
      },
      SuccessWrapper: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
        },
        required: ["success", "data"],
      },
      PaginationMeta: {
        type: "object",
        properties: {
          total: { type: "integer", example: 42 },
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          totalPages: { type: "integer", example: 3 },
        },
      },

      // ── Auth ──────────────────────────────────────────
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "priya.sharma@tixeltech.com",
          },
          password: { type: "string", example: "S3cur3Pa$$" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              token: {
                type: "string",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              },
              user: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    example: "clu1a2b3c4d5e6f7g8h9i0j1",
                  },
                  email: {
                    type: "string",
                    example: "priya.sharma@tixeltech.com",
                  },
                  name: { type: "string", example: "Priya Sharma" },
                  tenantId: {
                    type: "string",
                    example: "clt0x1y2z3a4b5c6d7e8f9g0",
                  },
                  tenantSlug: { type: "string", example: "tixeltech" },
                  roles: {
                    type: "array",
                    items: { type: "string" },
                    example: ["admin", "hr_manager"],
                  },
                  employee: {
                    type: "object",
                    nullable: true,
                    properties: {
                      id: { type: "string", example: "emp_001" },
                      employeeId: { type: "string", example: "TXT-0042" },
                      firstName: { type: "string", example: "Priya" },
                      lastName: { type: "string", example: "Sharma" },
                      designation: {
                        type: "string",
                        example: "Senior Developer",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ── Dashboard ─────────────────────────────────────
      DashboardResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              employees: { type: "integer", example: 128 },
              activeProjects: { type: "integer", example: 14 },
              monthlyRevenue: { type: "number", example: 1845000.5 },
              pendingInvoices: { type: "integer", example: 7 },
              todayAttendance: { type: "integer", example: 112 },
              pendingLeaves: { type: "integer", example: 5 },
              openTasks: { type: "integer", example: 34 },
              recentNotifications: {
                type: "array",
                items: { $ref: "#/components/schemas/NotificationSummary" },
              },
            },
          },
        },
      },
      NotificationSummary: {
        type: "object",
        properties: {
          id: { type: "string", example: "notif_9xkz1" },
          type: { type: "string", example: "LEAVE_APPROVED" },
          title: { type: "string", example: "Leave approved" },
          message: {
            type: "string",
            example: "Your casual leave for 25 Apr has been approved.",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-23T09:15:00.000Z",
          },
        },
      },

      // ── Attendance ────────────────────────────────────
      AttendanceRecord: {
        type: "object",
        properties: {
          id: { type: "string", example: "att_a1b2c3" },
          employeeId: { type: "string", example: "emp_001" },
          employeeName: { type: "string", example: "Rahul Mehta" },
          date: {
            type: "string",
            format: "date",
            example: "2026-04-24",
          },
          clockIn: {
            type: "string",
            format: "date-time",
            example: "2026-04-24T09:02:00.000Z",
          },
          clockOut: {
            type: "string",
            format: "date-time",
            nullable: true,
            example: "2026-04-24T18:05:00.000Z",
          },
          status: {
            type: "string",
            enum: ["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY"],
            example: "PRESENT",
          },
          hoursWorked: { type: "number", nullable: true, example: 9.05 },
          latitude: { type: "number", nullable: true, example: 12.9716 },
          longitude: { type: "number", nullable: true, example: 77.5946 },
          locationName: {
            type: "string",
            nullable: true,
            example: "Bangalore Office",
          },
        },
      },
      ClockInRequest: {
        type: "object",
        required: ["action"],
        properties: {
          action: {
            type: "string",
            enum: ["clock_in", "clock_out"],
            example: "clock_in",
          },
          latitude: { type: "number", example: 12.9716 },
          longitude: { type: "number", example: 77.5946 },
          notes: { type: "string", example: "Working from client site" },
        },
      },

      // ── Leaves ────────────────────────────────────────
      LeaveRequest: {
        type: "object",
        properties: {
          id: { type: "string", example: "lv_x1y2z3" },
          employeeId: { type: "string", example: "emp_001" },
          employeeName: { type: "string", example: "Anita Desai" },
          leaveType: {
            type: "string",
            enum: [
              "CASUAL",
              "SICK",
              "EARNED",
              "MATERNITY",
              "PATERNITY",
              "UNPAID",
            ],
            example: "CASUAL",
          },
          startDate: {
            type: "string",
            format: "date",
            example: "2026-04-28",
          },
          endDate: {
            type: "string",
            format: "date",
            example: "2026-04-29",
          },
          totalDays: { type: "number", example: 2 },
          reason: { type: "string", example: "Family function" },
          status: {
            type: "string",
            enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
            example: "PENDING",
          },
          appliedAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-22T10:30:00.000Z",
          },
        },
      },
      CreateLeaveRequest: {
        type: "object",
        required: ["leaveType", "startDate", "endDate", "reason"],
        properties: {
          leaveType: {
            type: "string",
            enum: [
              "CASUAL",
              "SICK",
              "EARNED",
              "MATERNITY",
              "PATERNITY",
              "UNPAID",
            ],
            example: "CASUAL",
          },
          startDate: {
            type: "string",
            format: "date",
            example: "2026-04-28",
          },
          endDate: {
            type: "string",
            format: "date",
            example: "2026-04-29",
          },
          reason: { type: "string", example: "Family function" },
        },
      },
      LeaveBalance: {
        type: "object",
        properties: {
          leaveType: { type: "string", example: "CASUAL" },
          total: { type: "number", example: 12 },
          used: { type: "number", example: 4 },
          remaining: { type: "number", example: 8 },
        },
      },

      // ── Tasks ─────────────────────────────────────────
      Task: {
        type: "object",
        properties: {
          id: { type: "string", example: "task_m1n2o3" },
          title: { type: "string", example: "Integrate Razorpay webhook" },
          description: {
            type: "string",
            example:
              "Set up payment confirmation webhook for order processing.",
          },
          status: {
            type: "string",
            enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
            example: "IN_PROGRESS",
          },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
            example: "HIGH",
          },
          assigneeId: { type: "string", example: "emp_005" },
          assigneeName: { type: "string", example: "Vikram Patel" },
          projectId: { type: "string", nullable: true, example: "proj_abc" },
          projectName: {
            type: "string",
            nullable: true,
            example: "ERP Phase 2",
          },
          dueDate: {
            type: "string",
            format: "date",
            nullable: true,
            example: "2026-05-01",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-15T08:00:00.000Z",
          },
        },
      },
      UpdateTaskRequest: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
            example: "DONE",
          },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          },
        },
      },

      // ── Employees ─────────────────────────────────────
      Employee: {
        type: "object",
        properties: {
          id: { type: "string", example: "emp_001" },
          employeeId: { type: "string", example: "TXT-0042" },
          firstName: { type: "string", example: "Deepa" },
          lastName: { type: "string", example: "Krishnan" },
          email: { type: "string", example: "deepa.k@tixeltech.com" },
          phone: { type: "string", example: "+91 98765 43210" },
          designation: { type: "string", example: "Product Manager" },
          department: { type: "string", example: "Engineering" },
          status: {
            type: "string",
            enum: ["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"],
            example: "ACTIVE",
          },
          joinDate: {
            type: "string",
            format: "date",
            example: "2024-03-15",
          },
          avatarUrl: {
            type: "string",
            nullable: true,
            example: "https://cdn.tixelerp.com/avatars/deepa.jpg",
          },
        },
      },
      EmployeeDetail: {
        allOf: [
          { $ref: "#/components/schemas/Employee" },
          {
            type: "object",
            properties: {
              dateOfBirth: {
                type: "string",
                format: "date",
                example: "1992-07-14",
              },
              address: {
                type: "string",
                example:
                  "42, MG Road, Indiranagar, Bangalore, Karnataka 560038",
              },
              emergencyContact: {
                type: "string",
                example: "+91 99887 65432",
              },
              panNumber: { type: "string", example: "ABCPD1234E" },
              bankAccount: {
                type: "object",
                properties: {
                  bankName: { type: "string", example: "HDFC Bank" },
                  accountNumber: { type: "string", example: "XXXX1234" },
                  ifscCode: { type: "string", example: "HDFC0001234" },
                },
              },
              salary: {
                type: "object",
                properties: {
                  basic: { type: "number", example: 75000 },
                  hra: { type: "number", example: 30000 },
                  gross: { type: "number", example: 125000 },
                  currency: { type: "string", example: "INR" },
                },
              },
            },
          },
        ],
      },

      // ── Notifications ─────────────────────────────────
      Notification: {
        type: "object",
        properties: {
          id: { type: "string", example: "notif_9xkz1" },
          type: {
            type: "string",
            enum: [
              "LEAVE_APPROVED",
              "LEAVE_REJECTED",
              "TASK_ASSIGNED",
              "TASK_UPDATED",
              "ANNOUNCEMENT",
              "PAYSLIP_GENERATED",
              "TICKET_REPLY",
            ],
            example: "TASK_ASSIGNED",
          },
          title: { type: "string", example: "New task assigned" },
          message: {
            type: "string",
            example:
              "You have been assigned 'Integrate Razorpay webhook' by Priya Sharma.",
          },
          isRead: { type: "boolean", example: false },
          link: {
            type: "string",
            nullable: true,
            example: "/tasks/task_m1n2o3",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-23T14:00:00.000Z",
          },
        },
      },
      MarkReadRequest: {
        type: "object",
        properties: {
          notificationIds: {
            type: "array",
            items: { type: "string" },
            example: ["notif_9xkz1", "notif_8wjy2"],
          },
        },
        required: ["notificationIds"],
      },

      // ── Profile ───────────────────────────────────────
      UserProfile: {
        type: "object",
        properties: {
          id: { type: "string", example: "clu1a2b3c4d5e6f7g8h9i0j1" },
          email: { type: "string", example: "priya.sharma@tixeltech.com" },
          name: { type: "string", example: "Priya Sharma" },
          phone: { type: "string", nullable: true, example: "+91 98765 43210" },
          avatarUrl: {
            type: "string",
            nullable: true,
            example: "https://cdn.tixelerp.com/avatars/priya.jpg",
          },
          roles: {
            type: "array",
            items: { type: "string" },
            example: ["admin"],
          },
          employee: {
            type: "object",
            nullable: true,
            properties: {
              employeeId: { type: "string", example: "TXT-0042" },
              designation: { type: "string", example: "Senior Developer" },
              department: { type: "string", example: "Engineering" },
            },
          },
          tenantName: { type: "string", example: "TixelTech Solutions" },
        },
      },
      UpdateProfileRequest: {
        type: "object",
        properties: {
          name: { type: "string", example: "Priya S. Sharma" },
          phone: { type: "string", example: "+91 98765 43210" },
          avatarUrl: {
            type: "string",
            example: "https://cdn.tixelerp.com/avatars/priya_new.jpg",
          },
        },
      },

      // ── Projects ──────────────────────────────────────
      Project: {
        type: "object",
        properties: {
          id: { type: "string", example: "proj_abc" },
          name: { type: "string", example: "ERP Phase 2" },
          description: {
            type: "string",
            example:
              "Mobile app and API layer for the TixelERP platform.",
          },
          status: {
            type: "string",
            enum: ["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"],
            example: "IN_PROGRESS",
          },
          startDate: {
            type: "string",
            format: "date",
            example: "2026-01-10",
          },
          endDate: {
            type: "string",
            format: "date",
            nullable: true,
            example: "2026-06-30",
          },
          budget: { type: "number", example: 2500000 },
          currency: { type: "string", example: "INR" },
          managerId: { type: "string", example: "emp_003" },
          managerName: { type: "string", example: "Suresh Iyer" },
          memberCount: { type: "integer", example: 8 },
          taskCount: { type: "integer", example: 47 },
          completedTaskCount: { type: "integer", example: 31 },
        },
      },
      ProjectDetail: {
        allOf: [
          { $ref: "#/components/schemas/Project" },
          {
            type: "object",
            properties: {
              members: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    employeeId: { type: "string", example: "emp_005" },
                    name: { type: "string", example: "Vikram Patel" },
                    role: { type: "string", example: "Developer" },
                  },
                },
              },
              milestones: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", example: "ms_01" },
                    title: { type: "string", example: "API v1 Launch" },
                    dueDate: {
                      type: "string",
                      format: "date",
                      example: "2026-03-31",
                    },
                    status: { type: "string", example: "COMPLETED" },
                  },
                },
              },
            },
          },
        ],
      },

      // ── Inventory ─────────────────────────────────────
      Product: {
        type: "object",
        properties: {
          id: { type: "string", example: "prod_k8j7" },
          sku: { type: "string", example: "TXL-WIDGET-001" },
          name: { type: "string", example: "Precision Widget A" },
          category: { type: "string", example: "Components" },
          quantity: { type: "integer", example: 350 },
          unit: { type: "string", example: "pcs" },
          unitPrice: { type: "number", example: 425.0 },
          currency: { type: "string", example: "INR" },
          reorderLevel: { type: "integer", example: 50 },
          warehouseLocation: {
            type: "string",
            example: "Warehouse B, Rack 14",
          },
          lastRestocked: {
            type: "string",
            format: "date",
            example: "2026-04-10",
          },
        },
      },
      BarcodeScanRequest: {
        type: "object",
        required: ["code"],
        properties: {
          code: { type: "string", example: "TXL-WIDGET-001" },
          type: {
            type: "string",
            enum: ["barcode", "sku"],
            example: "sku",
            description: "Defaults to sku if not provided.",
          },
        },
      },

      // ── Tickets ───────────────────────────────────────
      Ticket: {
        type: "object",
        properties: {
          id: { type: "string", example: "tkt_q2w3e4" },
          subject: {
            type: "string",
            example: "Cannot generate payslip for March",
          },
          description: {
            type: "string",
            example:
              "When I click 'Generate Payslip' for March 2026, it shows a blank page.",
          },
          status: {
            type: "string",
            enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
            example: "OPEN",
          },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            example: "HIGH",
          },
          category: {
            type: "string",
            example: "Payroll",
          },
          createdBy: { type: "string", example: "Rahul Mehta" },
          assignedTo: {
            type: "string",
            nullable: true,
            example: "Support Team",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-20T11:30:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-22T09:15:00.000Z",
          },
        },
      },
      CreateTicketRequest: {
        type: "object",
        required: ["subject", "description"],
        properties: {
          subject: {
            type: "string",
            example: "Cannot generate payslip for March",
          },
          description: {
            type: "string",
            example:
              "When I click 'Generate Payslip' for March 2026, it shows a blank page.",
          },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            example: "HIGH",
          },
          category: { type: "string", example: "Payroll" },
        },
      },

      // ── Tenders ───────────────────────────────────────
      Tender: {
        type: "object",
        properties: {
          id: { type: "string", example: "tnd_r4s5t6" },
          tenderNumber: { type: "string", example: "TND-2026-0087" },
          title: {
            type: "string",
            example: "Construction of 4-Lane Highway, NH-48 Bypass, Rajasthan",
          },
          description: {
            type: "string",
            example:
              "Supply of labour, materials, and machinery for the construction of a 12 km four-lane bypass on NH-48 near Udaipur, Rajasthan.",
          },
          issuingAuthority: {
            type: "string",
            example: "National Highways Authority of India (NHAI)",
          },
          category: {
            type: "string",
            enum: ["CIVIL", "ELECTRICAL", "MECHANICAL", "PLUMBING", "ROAD", "BRIDGE", "BUILDING", "OTHER"],
            example: "ROAD",
          },
          status: {
            type: "string",
            enum: ["DRAFT", "PUBLISHED", "SUBMITTED", "UNDER_EVALUATION", "AWARDED", "REJECTED", "CANCELLED"],
            example: "PUBLISHED",
          },
          estimatedValue: { type: "number", example: 45000000 },
          currency: { type: "string", example: "INR" },
          submissionDeadline: {
            type: "string",
            format: "date-time",
            example: "2026-05-15T17:00:00.000Z",
          },
          openingDate: {
            type: "string",
            format: "date-time",
            nullable: true,
            example: "2026-05-16T10:00:00.000Z",
          },
          emdRequired: { type: "boolean", example: true },
          emdAmount: { type: "number", nullable: true, example: 900000 },
          projectId: { type: "string", nullable: true, example: "proj_abc" },
          projectName: { type: "string", nullable: true, example: "NH-48 Bypass Phase 1" },
          bidCount: { type: "integer", example: 3 },
          createdBy: { type: "string", example: "Suresh Iyer" },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-10T08:30:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-22T14:20:00.000Z",
          },
        },
      },
      CreateTenderRequest: {
        type: "object",
        required: ["title", "category", "estimatedValue", "submissionDeadline"],
        properties: {
          title: {
            type: "string",
            example: "Construction of 4-Lane Highway, NH-48 Bypass, Rajasthan",
          },
          description: {
            type: "string",
            example:
              "Supply of labour, materials, and machinery for the construction of a 12 km four-lane bypass on NH-48 near Udaipur, Rajasthan.",
          },
          issuingAuthority: {
            type: "string",
            example: "National Highways Authority of India (NHAI)",
          },
          category: {
            type: "string",
            enum: ["CIVIL", "ELECTRICAL", "MECHANICAL", "PLUMBING", "ROAD", "BRIDGE", "BUILDING", "OTHER"],
            example: "ROAD",
          },
          estimatedValue: { type: "number", example: 45000000 },
          currency: { type: "string", example: "INR" },
          submissionDeadline: {
            type: "string",
            format: "date-time",
            example: "2026-05-15T17:00:00.000Z",
          },
          openingDate: {
            type: "string",
            format: "date-time",
            example: "2026-05-16T10:00:00.000Z",
          },
          emdRequired: { type: "boolean", example: true },
          emdAmount: { type: "number", example: 900000 },
          projectId: { type: "string", example: "proj_abc" },
        },
      },
      UpdateTenderRequest: {
        type: "object",
        properties: {
          title: { type: "string", example: "Updated: NH-48 Bypass Construction" },
          status: {
            type: "string",
            enum: ["DRAFT", "PUBLISHED", "SUBMITTED", "UNDER_EVALUATION", "AWARDED", "REJECTED", "CANCELLED"],
            example: "SUBMITTED",
          },
          submissionDeadline: {
            type: "string",
            format: "date-time",
            example: "2026-05-20T17:00:00.000Z",
          },
          estimatedValue: { type: "number", example: 47000000 },
          emdAmount: { type: "number", example: 940000 },
        },
      },

      // ── Bids ──────────────────────────────────────────
      Bid: {
        type: "object",
        properties: {
          id: { type: "string", example: "bid_u7v8w9" },
          tenderId: { type: "string", example: "tnd_r4s5t6" },
          tenderTitle: {
            type: "string",
            example: "Construction of 4-Lane Highway, NH-48 Bypass, Rajasthan",
          },
          bidderName: { type: "string", example: "Agarwal Construction Pvt. Ltd." },
          bidderContactEmail: {
            type: "string",
            example: "tenders@agarwalconstruction.in",
          },
          bidAmount: { type: "number", example: 42500000 },
          currency: { type: "string", example: "INR" },
          status: {
            type: "string",
            enum: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
            example: "SUBMITTED",
          },
          technicalScore: { type: "number", nullable: true, example: 78.5 },
          financialScore: { type: "number", nullable: true, example: 85.0 },
          remarks: {
            type: "string",
            nullable: true,
            example: "Competitive pricing with strong track record on NHAI projects.",
          },
          submittedAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-20T16:45:00.000Z",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-18T09:00:00.000Z",
          },
        },
      },
      CreateBidRequest: {
        type: "object",
        required: ["bidderName", "bidAmount"],
        properties: {
          bidderName: { type: "string", example: "Agarwal Construction Pvt. Ltd." },
          bidderContactEmail: {
            type: "string",
            format: "email",
            example: "tenders@agarwalconstruction.in",
          },
          bidAmount: { type: "number", example: 42500000 },
          currency: { type: "string", example: "INR" },
          technicalScore: { type: "number", example: 78.5 },
          financialScore: { type: "number", example: 85.0 },
          remarks: {
            type: "string",
            example: "Competitive pricing with strong track record on NHAI projects.",
          },
        },
      },

      // ── BOQ ───────────────────────────────────────────
      BOQItem: {
        type: "object",
        properties: {
          id: { type: "string", example: "boq_x1y2z3" },
          tenderId: { type: "string", example: "tnd_r4s5t6" },
          slNo: { type: "integer", example: 1 },
          itemDescription: {
            type: "string",
            example: "Earthwork excavation in ordinary soil, including disposal within 50m lead",
          },
          unit: { type: "string", example: "cum" },
          quantity: { type: "number", example: 12500 },
          unitRate: { type: "number", example: 185.5 },
          amount: { type: "number", example: 2318750 },
          remarks: {
            type: "string",
            nullable: true,
            example: "As per IRC SP:19 specification",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-12T10:00:00.000Z",
          },
        },
      },
      CreateBOQItemRequest: {
        type: "object",
        required: ["itemDescription", "unit", "quantity", "unitRate"],
        properties: {
          slNo: { type: "integer", example: 1 },
          itemDescription: {
            type: "string",
            example: "Earthwork excavation in ordinary soil, including disposal within 50m lead",
          },
          unit: { type: "string", example: "cum" },
          quantity: { type: "number", example: 12500 },
          unitRate: { type: "number", example: 185.5 },
          remarks: {
            type: "string",
            example: "As per IRC SP:19 specification",
          },
        },
      },

      // ── EMD ───────────────────────────────────────────
      EMDRecord: {
        type: "object",
        properties: {
          id: { type: "string", example: "emd_a1b2c3" },
          tenderId: { type: "string", example: "tnd_r4s5t6" },
          tenderTitle: {
            type: "string",
            example: "Construction of 4-Lane Highway, NH-48 Bypass, Rajasthan",
          },
          amount: { type: "number", example: 900000 },
          currency: { type: "string", example: "INR" },
          instrumentType: {
            type: "string",
            enum: ["BANK_GUARANTEE", "FDR", "DEMAND_DRAFT", "ONLINE_TRANSFER", "INSURANCE_SURETY_BOND"],
            example: "BANK_GUARANTEE",
          },
          instrumentNumber: { type: "string", example: "BG/HDFC/2026/04/7821" },
          issuingBank: { type: "string", example: "HDFC Bank, Commercial Branch, Mumbai" },
          issueDate: {
            type: "string",
            format: "date",
            example: "2026-04-10",
          },
          expiryDate: {
            type: "string",
            format: "date",
            example: "2026-10-10",
          },
          status: {
            type: "string",
            enum: ["ACTIVE", "RELEASED", "FORFEITED", "EXPIRED", "EXTENDED"],
            example: "ACTIVE",
          },
          releasedDate: {
            type: "string",
            format: "date",
            nullable: true,
            example: null,
          },
          remarks: {
            type: "string",
            nullable: true,
            example: "Valid for 6 months from date of issue",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-10T11:00:00.000Z",
          },
        },
      },
      CreateEMDRecordRequest: {
        type: "object",
        required: ["tenderId", "amount", "instrumentType", "instrumentNumber", "issuingBank", "issueDate", "expiryDate"],
        properties: {
          tenderId: { type: "string", example: "tnd_r4s5t6" },
          amount: { type: "number", example: 900000 },
          currency: { type: "string", example: "INR" },
          instrumentType: {
            type: "string",
            enum: ["BANK_GUARANTEE", "FDR", "DEMAND_DRAFT", "ONLINE_TRANSFER", "INSURANCE_SURETY_BOND"],
            example: "BANK_GUARANTEE",
          },
          instrumentNumber: { type: "string", example: "BG/HDFC/2026/04/7821" },
          issuingBank: { type: "string", example: "HDFC Bank, Commercial Branch, Mumbai" },
          issueDate: {
            type: "string",
            format: "date",
            example: "2026-04-10",
          },
          expiryDate: {
            type: "string",
            format: "date",
            example: "2026-10-10",
          },
          remarks: {
            type: "string",
            example: "Valid for 6 months from date of issue",
          },
        },
      },

      // ── CV Bank ───────────────────────────────────────
      CVRecord: {
        type: "object",
        properties: {
          id: { type: "string", example: "cv_d4e5f6" },
          fullName: { type: "string", example: "Rajesh Kumar Yadav" },
          email: {
            type: "string",
            format: "email",
            example: "rajesh.yadav@gmail.com",
          },
          phone: { type: "string", example: "+91 94561 23456" },
          designation: { type: "string", example: "Senior Site Engineer" },
          department: { type: "string", example: "Civil Engineering" },
          experienceYears: { type: "number", example: 12 },
          skills: {
            type: "array",
            items: { type: "string" },
            example: ["RCC Design", "Highway Construction", "AutoCAD", "Primavera P6", "Quality Control"],
          },
          currentEmployer: {
            type: "string",
            nullable: true,
            example: "Larsen & Toubro Ltd.",
          },
          location: { type: "string", example: "Pune, Maharashtra" },
          resumeUrl: {
            type: "string",
            nullable: true,
            example: "https://cdn.tixelerp.com/cvs/rajesh_yadav_2026.pdf",
          },
          availability: {
            type: "string",
            enum: ["IMMEDIATE", "15_DAYS", "30_DAYS", "60_DAYS", "NOT_AVAILABLE"],
            example: "30_DAYS",
          },
          expectedCtcLpa: {
            type: "number",
            nullable: true,
            example: 18.5,
            description: "Expected CTC in lakhs per annum.",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            example: ["highway", "nhai", "senior"],
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-03-15T09:30:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-04-20T11:00:00.000Z",
          },
        },
      },
      CreateCVRecordRequest: {
        type: "object",
        required: ["fullName", "designation", "experienceYears"],
        properties: {
          fullName: { type: "string", example: "Rajesh Kumar Yadav" },
          email: {
            type: "string",
            format: "email",
            example: "rajesh.yadav@gmail.com",
          },
          phone: { type: "string", example: "+91 94561 23456" },
          designation: { type: "string", example: "Senior Site Engineer" },
          department: { type: "string", example: "Civil Engineering" },
          experienceYears: { type: "number", example: 12 },
          skills: {
            type: "array",
            items: { type: "string" },
            example: ["RCC Design", "Highway Construction", "AutoCAD"],
          },
          currentEmployer: { type: "string", example: "Larsen & Toubro Ltd." },
          location: { type: "string", example: "Pune, Maharashtra" },
          resumeUrl: {
            type: "string",
            example: "https://cdn.tixelerp.com/cvs/rajesh_yadav_2026.pdf",
          },
          availability: {
            type: "string",
            enum: ["IMMEDIATE", "15_DAYS", "30_DAYS", "60_DAYS", "NOT_AVAILABLE"],
            example: "30_DAYS",
          },
          expectedCtcLpa: { type: "number", example: 18.5 },
          tags: {
            type: "array",
            items: { type: "string" },
            example: ["highway", "nhai", "senior"],
          },
        },
      },
      CVSearchRequest: {
        type: "object",
        required: ["keywords"],
        properties: {
          keywords: {
            type: "string",
            example: "highway construction site engineer 10+ years NHAI",
          },
          designation: { type: "string", example: "Site Engineer" },
          minExperience: { type: "number", example: 8 },
          maxExperience: { type: "number", example: 20 },
          availability: {
            type: "string",
            enum: ["IMMEDIATE", "15_DAYS", "30_DAYS", "60_DAYS", "NOT_AVAILABLE"],
          },
          location: { type: "string", example: "Maharashtra" },
          limit: { type: "integer", default: 20, example: 10 },
        },
      },
      CVSearchResult: {
        type: "object",
        properties: {
          cv: { $ref: "#/components/schemas/CVRecord" },
          relevanceScore: {
            type: "number",
            example: 92.5,
            description: "Match score from 0 to 100 based on keyword relevance.",
          },
          matchedSkills: {
            type: "array",
            items: { type: "string" },
            example: ["Highway Construction", "AutoCAD"],
          },
        },
      },
    },
    parameters: {
      PageParam: {
        name: "page",
        in: "query",
        schema: { type: "integer", default: 1 },
        description: "Page number (1-based).",
      },
      LimitParam: {
        name: "limit",
        in: "query",
        schema: { type: "integer", default: 20 },
        description: "Items per page.",
      },
    },
  },

  // ═══════════════════════════════════════════════════════
  //  PATHS
  // ═══════════════════════════════════════════════════════
  paths: {
    // ── Auth ────────────────────────────────────────────
    "/auth": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password",
        description:
          "Authenticates a user and returns a JWT token for subsequent API calls. Rate limited to 10 attempts per IP per minute.",
        operationId: "login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          "400": {
            description: "Missing email or password",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Email and password are required." },
              },
            },
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Invalid email or password." },
              },
            },
          },
          "423": {
            description: "Account locked after too many failed attempts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  error: "Account is locked. Please try again later.",
                },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  error: "Too many login attempts. Please try again later.",
                },
              },
            },
          },
        },
      },
    },

    // ── Dashboard ───────────────────────────────────────
    "/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Get dashboard summary",
        description:
          "Returns key metrics including employee count, active projects, monthly revenue, attendance, pending leaves, open tasks, and recent notifications.",
        operationId: "getDashboard",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Dashboard data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DashboardResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ── Attendance ──────────────────────────────────────
    "/attendance": {
      get: {
        tags: ["Attendance"],
        summary: "List attendance records",
        description:
          "Returns attendance records for the current user (or all employees if the caller has HR/admin role). Supports date range filtering.",
        operationId: "listAttendance",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Filter from this date (inclusive).",
            example: "2026-04-01",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Filter up to this date (inclusive).",
            example: "2026-04-24",
          },
          {
            name: "employeeId",
            in: "query",
            schema: { type: "string" },
            description: "Filter by specific employee (admin/HR only).",
          },
        ],
        responses: {
          "200": {
            description: "Paginated attendance list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/AttendanceRecord",
                          },
                        },
                        total: { type: "integer", example: 22 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Attendance"],
        summary: "Clock in or clock out",
        description:
          "Records a clock-in or clock-out event for the authenticated employee. GPS coordinates are optional but recommended.",
        operationId: "clockInOut",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ClockInRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Clock action recorded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/AttendanceRecord" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid action or already clocked in/out",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Already clocked in for today." },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ── Leaves ──────────────────────────────────────────
    "/leaves": {
      get: {
        tags: ["Leaves"],
        summary: "List leave requests",
        description:
          "Returns leave requests for the current employee, or all employees if the caller has HR/admin privileges.",
        operationId: "listLeaves",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
            },
            description: "Filter by leave status.",
          },
          {
            name: "leaveType",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "CASUAL",
                "SICK",
                "EARNED",
                "MATERNITY",
                "PATERNITY",
                "UNPAID",
              ],
            },
            description: "Filter by leave type.",
          },
        ],
        responses: {
          "200": {
            description: "Paginated leave list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/LeaveRequest",
                          },
                        },
                        total: { type: "integer", example: 8 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Leaves"],
        summary: "Apply for leave",
        description:
          "Submits a new leave request for the authenticated employee.",
        operationId: "createLeave",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateLeaveRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Leave request created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/LeaveRequest" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error (e.g. insufficient balance)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Insufficient casual leave balance." },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/leaves/balance": {
      get: {
        tags: ["Leaves"],
        summary: "Get leave balances",
        description:
          "Returns remaining leave balances by type for the authenticated employee.",
        operationId: "getLeaveBalance",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Leave balances",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/LeaveBalance",
                      },
                    },
                  },
                },
                example: {
                  success: true,
                  data: [
                    { leaveType: "CASUAL", total: 12, used: 4, remaining: 8 },
                    { leaveType: "SICK", total: 10, used: 2, remaining: 8 },
                    { leaveType: "EARNED", total: 15, used: 0, remaining: 15 },
                  ],
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ── Tasks ───────────────────────────────────────────
    "/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List tasks",
        description:
          "Returns tasks assigned to the current user. Admins can see all tasks within the tenant.",
        operationId: "listTasks",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
            },
            description: "Filter by task status.",
          },
          {
            name: "priority",
            in: "query",
            schema: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
            },
            description: "Filter by priority.",
          },
          {
            name: "projectId",
            in: "query",
            schema: { type: "string" },
            description: "Filter by project.",
          },
        ],
        responses: {
          "200": {
            description: "Paginated task list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Task" },
                        },
                        total: { type: "integer", example: 34 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Tasks"],
        summary: "Update task status",
        description:
          "Updates a task's status or priority. Requires the task ID as a query parameter.",
        operationId: "updateTask",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "taskId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "ID of the task to update.",
            example: "task_m1n2o3",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTaskRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Task updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid status transition",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Task not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Task not found." },
              },
            },
          },
        },
      },
    },

    // ── Employees ───────────────────────────────────────
    "/employees": {
      get: {
        tags: ["Employees"],
        summary: "List employees",
        description:
          "Returns a paginated list of employees in the tenant. Supports search by name and department filter.",
        operationId: "listEmployees",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by name or employee ID.",
            example: "Deepa",
          },
          {
            name: "department",
            in: "query",
            schema: { type: "string" },
            description: "Filter by department name.",
            example: "Engineering",
          },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"],
            },
            description: "Filter by employment status.",
          },
        ],
        responses: {
          "200": {
            description: "Paginated employee list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Employee" },
                        },
                        total: { type: "integer", example: 128 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 7 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/employees/{id}": {
      get: {
        tags: ["Employees"],
        summary: "Get employee detail",
        description:
          "Returns full details for a single employee, including salary, bank, and personal information.",
        operationId: "getEmployee",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Employee ID.",
            example: "emp_001",
          },
        ],
        responses: {
          "200": {
            description: "Employee detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/EmployeeDetail" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Employee not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Employee not found." },
              },
            },
          },
        },
      },
    },

    // ── Notifications ───────────────────────────────────
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications",
        description:
          "Returns notifications for the authenticated user, newest first.",
        operationId: "listNotifications",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          {
            name: "unreadOnly",
            in: "query",
            schema: { type: "boolean", default: false },
            description: "When true, returns only unread notifications.",
          },
        ],
        responses: {
          "200": {
            description: "Paginated notification list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/Notification",
                          },
                        },
                        total: { type: "integer", example: 15 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Notifications"],
        summary: "Mark notifications as read",
        description:
          "Marks one or more notifications as read for the authenticated user.",
        operationId: "markNotificationsRead",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MarkReadRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Notifications marked as read",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        markedCount: { type: "integer", example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ── Profile ─────────────────────────────────────────
    "/profile": {
      get: {
        tags: ["Profile"],
        summary: "Get current user profile",
        description:
          "Returns the profile of the authenticated user, including linked employee details.",
        operationId: "getProfile",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "User profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/UserProfile" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Profile"],
        summary: "Update user profile",
        description:
          "Updates the authenticated user's profile fields (name, phone, avatar).",
        operationId: "updateProfile",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/UserProfile" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ── Projects ────────────────────────────────────────
    "/projects": {
      get: {
        tags: ["Projects"],
        summary: "List projects",
        description: "Returns a paginated list of projects within the tenant.",
        operationId: "listProjects",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "PLANNING",
                "IN_PROGRESS",
                "ON_HOLD",
                "COMPLETED",
                "CANCELLED",
              ],
            },
            description: "Filter by project status.",
          },
        ],
        responses: {
          "200": {
            description: "Paginated project list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Project" },
                        },
                        total: { type: "integer", example: 14 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get project detail",
        description:
          "Returns full project details including members and milestones.",
        operationId: "getProject",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Project ID.",
            example: "proj_abc",
          },
        ],
        responses: {
          "200": {
            description: "Project detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/ProjectDetail" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Project not found." },
              },
            },
          },
        },
      },
    },

    // ── Inventory ───────────────────────────────────────
    "/inventory": {
      get: {
        tags: ["Inventory"],
        summary: "List product inventory",
        description:
          "Returns a paginated list of products in the inventory. Supports category and search filters.",
        operationId: "listInventory",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by product name or SKU.",
            example: "widget",
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            description: "Filter by product category.",
            example: "Components",
          },
          {
            name: "lowStock",
            in: "query",
            schema: { type: "boolean" },
            description:
              "When true, returns only products at or below reorder level.",
          },
        ],
        responses: {
          "200": {
            description: "Paginated product list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Product" },
                        },
                        total: { type: "integer", example: 256 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 13 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/inventory/scan": {
      post: {
        tags: ["Inventory"],
        summary: "Barcode or SKU lookup",
        description:
          "Looks up a product by barcode or SKU code. Used by the mobile barcode scanner feature.",
        operationId: "scanInventory",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BarcodeScanRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Product found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Product" },
                  },
                },
              },
            },
          },
          "404": {
            description: "No product matching the scanned code",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  error: "No product found for code TXL-UNKNOWN-999.",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ── Tickets ─────────────────────────────────────────
    "/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "List support tickets",
        description:
          "Returns support tickets created by the current user. Admins see all tenant tickets.",
        operationId: "listTickets",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
            },
            description: "Filter by ticket status.",
          },
          {
            name: "priority",
            in: "query",
            schema: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            },
            description: "Filter by priority.",
          },
        ],
        responses: {
          "200": {
            description: "Paginated ticket list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Ticket" },
                        },
                        total: { type: "integer", example: 12 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Tickets"],
        summary: "Create a support ticket",
        description: "Opens a new support ticket for the authenticated user.",
        operationId: "createTicket",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTicketRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Ticket created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Ticket" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Subject is required." },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ── Tenders ─────────────────────────────────────────
    "/tenders": {
      get: {
        tags: ["Tenders"],
        summary: "List tenders",
        description:
          "Returns a paginated list of tenders within the tenant. Supports filtering by status, category, and free-text search across title and issuing authority.",
        operationId: "listTenders",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by tender title, number, or issuing authority.",
            example: "highway",
          },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["DRAFT", "PUBLISHED", "SUBMITTED", "UNDER_EVALUATION", "AWARDED", "REJECTED", "CANCELLED"],
            },
            description: "Filter by tender status.",
          },
          {
            name: "category",
            in: "query",
            schema: {
              type: "string",
              enum: ["CIVIL", "ELECTRICAL", "MECHANICAL", "PLUMBING", "ROAD", "BRIDGE", "BUILDING", "OTHER"],
            },
            description: "Filter by tender category.",
          },
        ],
        responses: {
          "200": {
            description: "Paginated tender list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Tender" },
                        },
                        total: { type: "integer", example: 23 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Tenders"],
        summary: "Create a new tender",
        description:
          "Creates a new tender record. The tender starts in DRAFT status by default. Only users with procurement or admin roles can create tenders.",
        operationId: "createTender",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTenderRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Tender created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Tender" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Title and submission deadline are required." },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/tenders/{id}": {
      get: {
        tags: ["Tenders"],
        summary: "Get tender detail",
        description:
          "Returns full details for a single tender, including bid count and EMD requirements.",
        operationId: "getTender",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Tender ID.",
            example: "tnd_r4s5t6",
          },
        ],
        responses: {
          "200": {
            description: "Tender detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Tender" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Tender not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Tender not found." },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Tenders"],
        summary: "Update a tender",
        description:
          "Updates fields on an existing tender. Status transitions are validated server-side (e.g., a CANCELLED tender cannot move back to PUBLISHED).",
        operationId: "updateTender",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Tender ID.",
            example: "tnd_r4s5t6",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTenderRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Tender updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Tender" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid status transition or validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Cannot transition from CANCELLED to PUBLISHED." },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Tender not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Tender not found." },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Tenders"],
        summary: "Delete a tender",
        description:
          "Permanently deletes a tender and its associated BOQ items. Only DRAFT tenders can be deleted. Tenders with submitted bids cannot be deleted.",
        operationId: "deleteTender",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Tender ID.",
            example: "tnd_r4s5t6",
          },
        ],
        responses: {
          "200": {
            description: "Tender deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string", example: "Tender deleted successfully." },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Tender has submitted bids or is not in DRAFT status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Only DRAFT tenders with no submitted bids can be deleted." },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Tender not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Tender not found." },
              },
            },
          },
        },
      },
    },

    // ── Bids ────────────────────────────────────────────
    "/tenders/{id}/bids": {
      get: {
        tags: ["Bids"],
        summary: "List bids for a tender",
        description:
          "Returns all bids submitted against a specific tender. Includes technical and financial scores where available.",
        operationId: "listBids",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Tender ID.",
            example: "tnd_r4s5t6",
          },
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
        ],
        responses: {
          "200": {
            description: "Paginated bid list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Bid" },
                        },
                        total: { type: "integer", example: 3 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Tender not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Tender not found." },
              },
            },
          },
        },
      },
      post: {
        tags: ["Bids"],
        summary: "Create a bid for a tender",
        description:
          "Submits a new bid against the specified tender. The tender must be in PUBLISHED status and the submission deadline must not have passed.",
        operationId: "createBid",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Tender ID.",
            example: "tnd_r4s5t6",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateBidRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Bid created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Bid" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error or submission deadline has passed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Submission deadline for this tender has passed." },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Tender not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Tender not found." },
              },
            },
          },
        },
      },
    },

    // ── BOQ ─────────────────────────────────────────────
    "/tenders/{id}/boq": {
      get: {
        tags: ["BOQ"],
        summary: "List BOQ items for a tender",
        description:
          "Returns the Bill of Quantities line items for a specific tender, ordered by serial number.",
        operationId: "listBOQItems",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Tender ID.",
            example: "tnd_r4s5t6",
          },
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
        ],
        responses: {
          "200": {
            description: "BOQ item list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/BOQItem" },
                        },
                        total: { type: "integer", example: 45 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 3 },
                        totalAmount: {
                          type: "number",
                          example: 45000000,
                          description: "Sum of all BOQ line item amounts for this tender.",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Tender not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Tender not found." },
              },
            },
          },
        },
      },
      post: {
        tags: ["BOQ"],
        summary: "Add a BOQ item to a tender",
        description:
          "Adds a new line item to the Bill of Quantities for the specified tender. The amount field is computed server-side as quantity * unitRate.",
        operationId: "createBOQItem",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Tender ID.",
            example: "tnd_r4s5t6",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateBOQItemRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "BOQ item created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/BOQItem" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Item description, unit, quantity, and unit rate are required." },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Tender not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Tender not found." },
              },
            },
          },
        },
      },
    },

    // ── EMD ─────────────────────────────────────────────
    "/emd": {
      get: {
        tags: ["EMD"],
        summary: "List EMD records",
        description:
          "Returns a paginated list of Earnest Money Deposit records. Use the expiringDays filter to find deposits expiring within a given number of days, which is useful for renewal alerts.",
        operationId: "listEMDs",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["ACTIVE", "RELEASED", "FORFEITED", "EXPIRED", "EXTENDED"],
            },
            description: "Filter by EMD status.",
          },
          {
            name: "expiringDays",
            in: "query",
            schema: { type: "integer" },
            description: "Return only EMDs expiring within this many days from today. Useful for tracking upcoming renewals.",
            example: 30,
          },
        ],
        responses: {
          "200": {
            description: "Paginated EMD list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/EMDRecord" },
                        },
                        total: { type: "integer", example: 9 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 1 },
                        totalActiveAmount: {
                          type: "number",
                          example: 4500000,
                          description: "Sum of all ACTIVE EMD amounts across the result set.",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["EMD"],
        summary: "Create an EMD record",
        description:
          "Records a new Earnest Money Deposit against a tender. Tracks the instrument details, issuing bank, and expiry so the system can send renewal reminders.",
        operationId: "createEMD",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateEMDRecordRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "EMD record created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/EMDRecord" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error or duplicate EMD for the same tender",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "An active EMD already exists for this tender." },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Referenced tender not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Tender not found." },
              },
            },
          },
        },
      },
    },

    // ── CV Bank ─────────────────────────────────────────
    "/cv-bank": {
      get: {
        tags: ["CV Bank"],
        summary: "List CVs",
        description:
          "Returns a paginated list of CV records in the resource bank. Supports filtering by designation and free-text search across name, skills, and employer.",
        operationId: "listCVs",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by name, skills, or current employer.",
            example: "highway engineer",
          },
          {
            name: "designation",
            in: "query",
            schema: { type: "string" },
            description: "Filter by designation or role title.",
            example: "Site Engineer",
          },
          {
            name: "availability",
            in: "query",
            schema: {
              type: "string",
              enum: ["IMMEDIATE", "15_DAYS", "30_DAYS", "60_DAYS", "NOT_AVAILABLE"],
            },
            description: "Filter by candidate availability.",
          },
          {
            name: "minExperience",
            in: "query",
            schema: { type: "number" },
            description: "Minimum years of experience.",
            example: 5,
          },
        ],
        responses: {
          "200": {
            description: "Paginated CV list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/CVRecord" },
                        },
                        total: { type: "integer", example: 86 },
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        totalPages: { type: "integer", example: 5 },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["CV Bank"],
        summary: "Add a CV to the bank",
        description:
          "Creates a new CV record in the resource bank. Skills and tags are stored as arrays for keyword-based searching.",
        operationId: "createCV",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCVRecordRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "CV record created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/CVRecord" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Full name, designation, and experience are required." },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/cv-bank/search": {
      post: {
        tags: ["CV Bank"],
        summary: "Keyword search CVs with scoring",
        description:
          "Performs a weighted keyword search across all CV records and returns results ranked by a relevance score (0 to 100). Matches are scored based on skill overlap, designation match, and experience fit. This endpoint is designed for procurement teams assembling project teams for tender submissions.",
        operationId: "searchCVs",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CVSearchRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Scored CV search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        results: {
                          type: "array",
                          items: { $ref: "#/components/schemas/CVSearchResult" },
                        },
                        total: { type: "integer", example: 12 },
                        query: { type: "string", example: "highway construction site engineer 10+ years NHAI" },
                      },
                    },
                  },
                },
                example: {
                  success: true,
                  data: {
                    results: [
                      {
                        cv: {
                          id: "cv_d4e5f6",
                          fullName: "Rajesh Kumar Yadav",
                          designation: "Senior Site Engineer",
                          experienceYears: 12,
                          skills: ["RCC Design", "Highway Construction", "AutoCAD", "Primavera P6", "Quality Control"],
                          location: "Pune, Maharashtra",
                          availability: "30_DAYS",
                        },
                        relevanceScore: 92.5,
                        matchedSkills: ["Highway Construction", "AutoCAD"],
                      },
                    ],
                    total: 12,
                    query: "highway construction site engineer 10+ years NHAI",
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing or empty keywords",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Keywords field is required for search." },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
} as const;
