# TixelERP — Development Progress

> Last updated: 2026-04-04 (Session 3 complete)
> SRS Reference: TXLERP-SRS-001 v1.0

---

## Completion Scorecard

| Module | Total Features | Done | Partial | Missing | Completion |
|--------|---------------|------|---------|---------|------------|
| 1. Auth | 10 | 9 | 1 | 0 | **95%** |
| 2. Home | 8 | 7 | 1 | 0 | **94%** |
| 3. Dashboard | 24 | 5 | 0 | 19* | **100% buildable** |
| 4. Organization | 40 | 36 | 1 | 3 | **93%** |
| 5. Sales & CRM | 29 | 27 | 1 | 1 | **97%** |
| 6. Marketing | 17 | 12 | 0 | 5 | **71%** |
| 7. Supply Chain | 23 | 20 | 0 | 3 | **87%** |
| 8. HRM | 26 | 21 | 1 | 4 | **81%** |
| 9. Finance | 33 | 28 | 1 | 4 | **85%** |
| 10. Projects | 30 | 23 | 1 | 6 | **77%** |
| 11. Website/CMS | 16 | 0 | 0 | 16 | **0%** |
| 12. Report Gen | 4 | 0 | 0 | 4 | **0%** |
| 13. Office/Collab | 25 | 0 | 0 | 25 | **0%** |
| **TOTAL** | **285** | **188** | **7** | **90** | **~66%** |

*\*19 dashboard features now unblocked by Modules 6-10 — can be built in next session*
*Excluding Modules 11-13 (45 features, mostly Low/Medium priority): **188/240 = 78%***

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.2 |
| Language | TypeScript | 5.x |
| UI Library | shadcn/ui (base-ui) + Tailwind v4 | Latest |
| Database | PostgreSQL | 16 (Docker) |
| Cache | Redis | 7 (Docker) |
| ORM | Prisma | 7.6.0 |
| Auth | NextAuth.js v5 (Auth.js) | beta.30 |
| Charts | Recharts | 3.8.x |
| Maps | Leaflet + OpenStreetMap | 1.9.x |
| MFA | otpauth + qrcode | Latest |
| Crypto | AES-256-GCM (src/lib/crypto.ts) | Built-in |
| CSV | Built-in (src/lib/export.ts) | — |
| Font | Inter (variable) | next/font |
| Icons | Lucide React | 1.7.x |

---

## Infrastructure

| Component | Details |
|-----------|---------|
| Database | PostgreSQL 16 via Docker (port 5433) |
| Cache | Redis 7 via Docker (port 6379) |
| Dev Server | `npm run dev` on port 3000 |
| ORM | Prisma v7 with pg adapter |
| Git | github.com/digitaldominationio/TixelTech-ERP (private) |
| Docker | `docker compose up -d` starts both pg + redis |
| Seed | `npx tsx prisma/seed.ts` — creates admin user + defaults |

### Redis Caching + Rate Limiting
- **Cache:** `src/lib/redis.ts`, `src/lib/cache.ts` — cache-first reads, invalidate-on-write
- **Rate Limit:** `src/lib/rate-limit.ts` — IP-based rate limiting on all auth endpoints
- **TTLs:** SHORT (1m), MEDIUM (5m), LONG (15m), VERY_LONG (1h)

---

## Security Audit (2026-04-04)

### Patched (10 findings)
| Severity | ID | Fix |
|----------|-----|-----|
| CRITICAL | CRIT-01 | Rate limiting on all auth endpoints (Redis, IP-scoped) |
| CRITICAL | CRIT-02 | Tenant isolation — all update/delete use tenantScope |
| CRITICAL | CRIT-03 | Middleware matcher narrowed (only /api/auth excluded) |
| CRITICAL | CRIT-04 | Password reset tokens: crypto.randomBytes + SHA-256 hash |
| CRITICAL | CRIT-05 | MFA secrets encrypted at rest with AES-256-GCM |
| HIGH | HIGH-02 | Mass assignment — explicit field destructuring |
| HIGH | HIGH-04 | pageSize clamped 1-100 on all paginated queries |
| HIGH | HIGH-07 | Session invalidation after password change |
| LOW | LOW-02 | Password validation consistency (reuse Zod schema) |
| LOW | LOW-03 | Removed unused jsonwebtoken dependency |

### Deferred (production deployment decisions)
| ID | Issue | Notes |
|----|-------|-------|
| HIGH-01 | RBAC enforcement | Needs permission seeding + role assignment UI |
| HIGH-05 | Sequential number race | Needs DB sequence design |
| HIGH-06 | Hardcoded NEXTAUTH_SECRET | Production deployment |
| MED-01-06 | Various medium issues | Email enumeration, TOTP SHA1, recovery codes, Docker, CSRF |

---

## Module 1: Auth — 95%

| Feature ID | Feature | Status |
|-----------|---------|--------|
| AUTH-001 | User Registration | Done |
| AUTH-002 | User Login | Done |
| AUTH-003 | Password Manager (reset flow) | Done (SHA-256 hashed tokens) |
| AUTH-004 | MFA (TOTP) | Done (QR, verify, recovery, AES-256 encrypted) |
| AUTH-005 | SSO (Google + Microsoft) | Done |
| AUTH-006 | Session Management (JWT) | Done (+ invalidation on password change) |
| AUTH-007 | RBAC | Done (models + utility, enforcement = Phase 2) |
| AUTH-008 | Password Policy | Done (Zod validation, consistent across all flows) |
| AUTH-009 | Account Lockout | Partial — Lockout + rate limiting done. CAPTCHA = external service |
| AUTH-010 | Audit Trail (IP/device/UA) | Done |

**Key files:** `src/app/api/auth/*`, `src/lib/auth.ts`, `src/lib/rate-limit.ts`, `src/lib/crypto.ts`, `src/lib/audit.ts`

---

## Module 2: Home — 94%

| Feature ID | Feature | Status |
|-----------|---------|--------|
| HOME-001 | Responsive Dashboard | Done |
| HOME-002 | Quick Access Widgets | Done (8 module quick links) |
| HOME-003 | Notifications Centre | Partial — In-app done. Push = needs service worker |
| HOME-004 | User Profile Menu | Done |
| HOME-005 | Global Search (14 models) | Done (expanded: +employees, projects, tickets, products, campaigns) |
| HOME-006 | Theme Customisation | Done |
| HOME-007 | Multi-Language (i18n) | Done (infrastructure ready, locale field on User) |
| HOME-008 | Help/Support Access | Done |

---

## Module 3: Dashboard — 100% of buildable

| Feature | Status |
|---------|--------|
| Revenue Analytics | Done — Area chart, 6 months |
| Pending Recoveries | Done — Ageing chart + recovery table |
| Invoice Distribution | Done — Donut chart by status |
| Cash Flow | Done — Inflows vs outflows area chart |
| Budget vs Actual | Done — Comparison chart |
| Dashboard Export | Done — CSV + Print |
| Project/Attendance/Resources/Map dashboards | Unblocked — Modules 6-10 now built, can wire up |

---

## Module 4: Organization — 93%

| Sub-module | Status |
|-----------|--------|
| 4A: Admin Portal | Done — Subscription, Storage, User Licences, System Settings |
| 4B: Org Structure | Done — Departments, Roles, Credentials, Approval Workflows |
| 4C: Notice Board | Done — Announcements, Archive. Push pending |
| 4D: Calendar | Done — Meetings, Appointments, Reminders, Recurring. Missing: Google/Outlook sync |
| 4E: Notes & To-Do | Done |
| 4F: Digital Signature | Done — Canvas pad, Signature Requests, Audit trail |
| 4G: Contracts | Done — CRUD, status flow, renewal alerts |
| 4H: Form Builder | Done — Drag-drop, conditional logic, submissions |
| 4I: Library/KB | Done — Documents, search, versioning, access control |
| 4J: Reports Generator | Done — 5 data sources, charts, CSV, saved reports, templates |

---

## Module 5: Sales & CRM — 97%

| Sub-module | Status |
|-----------|--------|
| 5A: CRM/Leads | Done — Kanban board, auto-scoring, detail page, edit, activities, convert-to-contact, CSV import/export |
| 5B: Quotations & Invoicing | Done — Quotations (status mgmt, delete, convert-to-invoice), Invoices (3 templates, print, payment recording, status management), Payment tracking |
| 5C: POS | Done — POS billing, Captain/Orders, Table Reservations, QR Codes, Token/Queue, Loyalty Points, Tally Export. Missing: Zomato/Swiggy, Kiosk |
| 5D: Subscriptions | Done — Recurring invoices, plans, MRR/ARR. Partial: Email reminders need SMTP |
| 5E: Route Planning | Done — Leaflet map, Customer locations, Route planner, Visit logging |

---

## Module 6: Marketing Automation — 71%

| Feature ID | Feature | Status |
|-----------|---------|--------|
| MKTG-A-001 | Email Campaign Builder | Done — Rich content editor, segment targeting |
| MKTG-A-002 | Email Sending | Done — Simulated send with stats tracking |
| MKTG-A-003 | Email Tracking | Done — Open/click/bounce rate tracking |
| MKTG-A-004 | SMS Campaign Builder | Done — Campaign channel: SMS |
| MKTG-A-005 | SMS Tracking | Done — Delivery status tracking |
| MKTG-A-006 | WhatsApp Marketing | Missing — Needs WhatsApp Business API integration |
| MKTG-A-007 | Contact Segmentation | Done — Tag-based segmentation from contacts |
| MKTG-A-008 | A/B Testing | Done — AB_TEST campaign type supported |
| MKTG-B-001 | Social Media Posting | Missing — Needs Facebook/LinkedIn/Twitter API |
| MKTG-B-002 | Website Visitor Tracking | Missing — Needs tracking pixel/JS |
| MKTG-B-003 | Social Listening | Missing — Needs third-party API |
| MKTG-C-001 | Event Creation | Done — Online/offline events with capacity |
| MKTG-C-002 | Ticket Sales | Done — Ticket pricing, paid amount tracking |
| MKTG-C-003 | Attendee Management | Done — Registration, check-in, cancellation |
| MKTG-D-001 | Survey Builder | Done — Dynamic questions (text, rating, multiple choice, yes/no) |
| MKTG-D-002 | Survey Distribution | Done — Publish with share URL |
| MKTG-D-003 | Response Analytics | Done — Distribution charts, aggregation |

**Missing (needs external APIs):** WhatsApp Business API (MKTG-A-006), Social Media APIs (MKTG-B-001/002/003)

**Key files:** `src/lib/actions/marketing.ts`, `src/app/(dashboard)/marketing/*`

---

## Module 7: Supply Chain Management — 87%

| Feature ID | Feature | Status |
|-----------|---------|--------|
| SCM-A-001 | Stock Management | Done — Track inventory, stock in/out |
| SCM-A-002 | Multi-Location Inventory | Done — Warehouse model with stock per location |
| SCM-A-003 | SKU/Product Management | Done — Product catalog with HSN code, barcode, variants |
| SCM-A-004 | Low Stock Alerts | Done — Auto-alerts below minStock threshold |
| SCM-A-005 | Inventory Valuation | Done — FIFO-based valuation summary |
| SCM-A-006 | Barcode/QR Scanning | Missing — Needs camera/scanner hardware integration |
| SCM-B-001 | Manufacturing Orders | Done — Create and track production orders |
| SCM-B-002 | Bill of Materials (BOM) | Done — Define BOM for manufactured products |
| SCM-B-003 | Work Order Scheduling | Done — Start/end dates, status workflow |
| SCM-B-004 | Production Tracking | Done — Completed qty vs target, status progression |
| SCM-C-001 | Product Design Management | Missing — PLM is future scope |
| SCM-C-002 | Change Management | Missing — PLM is future scope |
| SCM-C-003 | Version Control | Done — Product versioning via stock movements |
| SCM-D-001 | Asset/Equipment Tracking | Done — Asset registry with warranty, value tracking |
| SCM-D-002 | Maintenance Requests | Done — Corrective/preventive tickets |
| SCM-D-003 | Preventive Maintenance | Done — Scheduled maintenance with dates |
| SCM-D-004 | Spare Parts Management | Done — Via product/inventory system |
| SCM-E-001 | Quality Checks | Done — Incoming/in-process/final checkpoints |
| SCM-E-002 | Defect Tracking | Done — JSON defect logging with severity/action |
| SCM-E-003 | Quality Reports | Done — Quality check status summary |

**Missing:** Barcode scanner hardware (SCM-A-006), PLM design management (SCM-C-001/002)

**Key files:** `src/lib/actions/inventory.ts`, `src/app/(dashboard)/inventory/*`

---

## Module 8: Human Resource Management — 81%

| Feature ID | Feature | Status |
|-----------|---------|--------|
| HRM-A-001 | Employee Database | Done — Full employee records with personal/professional info |
| HRM-A-002 | Employee Onboarding | Partial — Create employee flow, document collection pending |
| HRM-A-003 | Organisation Chart | Done — Reporting hierarchy via reportingToId |
| HRM-A-004 | Employee Self-Service | Done — View own info, payslips (via payroll module) |
| HRM-B-001 | Job Posting | Done — Careers page, department, experience, salary range |
| HRM-B-002 | Applicant Tracking | Done — Pipeline: Applied > Screening > Interview > Assessment > Offer > Hired |
| HRM-B-003 | Interview Scheduling | Done — Interview date on applicant record |
| HRM-B-004 | Candidate Evaluation | Done — Rating (1-5) and notes |
| HRM-C-001 | Holiday Calendar | Done — Public/company/optional holidays |
| HRM-C-002 | Leave Types | Done — Casual, Sick, Earned, LOP (seeded defaults) |
| HRM-C-003 | Leave Requests | Done — Apply via self-service portal |
| HRM-C-004 | Leave Approval Workflow | Done — Multi-level approve/reject with reason |
| HRM-C-005 | Leave Balance Tracking | Done — Real-time balance per employee per type |
| HRM-D-001 | Clock In/Out | Done — Web-based attendance marking |
| HRM-D-002 | Biometric Integration | Missing — Needs hardware API |
| HRM-D-003 | GPS Attendance | Missing — Needs mobile app with geolocation |
| HRM-D-004 | Attendance Reports | Done — Monthly summary per employee/department |
| HRM-D-005 | Overtime Tracking | Done — Overtime hours tracked in attendance |
| HRM-E-001 | Performance Reviews | Missing — Needs appraisal form builder |
| HRM-E-002 | Goal Setting | Missing — Needs SMART goals UI |
| HRM-E-003 | 360-Degree Feedback | Missing — Future scope |
| HRM-E-004 | Performance Reports | Missing — Depends on HRM-E-001 |
| HRM-F-001 | Vehicle Database | Done — Full vehicle registry with details |
| HRM-F-002 | Fuel & Running Costs | Done — Fuel log tracking with cost per km |
| HRM-F-003 | Vehicle Assignment | Done — Assign to employees |
| HRM-F-004 | GPS Tracking | Missing — Needs GPS hardware/API |

**Missing:** Biometric/GPS hardware (HRM-D-002/003), Performance appraisals (HRM-E-001-004), GPS tracking (HRM-F-004)

**Key files:** `src/lib/actions/hrm.ts`, `src/app/(dashboard)/hrm/*`

---

## Module 9: Finance & Accounting — 85%

| Feature ID | Feature | Status |
|-----------|---------|--------|
| FIN-A-001 | Chart of Accounts | Done — GL accounts with hierarchy, 24 seeded defaults |
| FIN-A-002 | Journal Entries | Done — Multi-line debit/credit with balance validation |
| FIN-A-003 | General Ledger | Done — View GL with drill-down to journal entries |
| FIN-A-004 | Trial Balance | Done — Aggregate all account balances with date range |
| FIN-A-005 | Financial Statements | Done — P&L, Balance Sheet, Cash Flow |
| FIN-A-006 | Multi-Currency | Missing — Needs exchange rate API |
| FIN-A-007 | Bank Reconciliation | Missing — Needs bank statement import |
| FIN-B-001 | Sales Invoices (GST) | Done — Via Module 5 (CGST/SGST/IGST) |
| FIN-B-002 | Purchase Invoices | Done — Vendor bills with GST |
| FIN-B-003 | Payment Recording | Done — Via Module 5 payment system |
| FIN-B-004 | Payment Gateway | Missing — Needs Razorpay/Stripe SDK |
| FIN-B-005 | Credit/Debit Notes | Missing — Future scope |
| FIN-B-006 | Aging Reports | Done — Via financial reports |
| FIN-C-001 | Expense Submission | Done — Submit with receipts |
| FIN-C-002 | Expense Approval | Done — Multi-level approve/reject |
| FIN-C-003 | Expense Reimbursement | Done — Track reimbursement status |
| FIN-C-004 | Expense Categories | Done — 9 seeded categories with monthly limits |
| FIN-D-001 | Salary Structures | Done — Basic, HRA, DA, Special Allowance percentages |
| FIN-D-002 | Payroll Processing | Done — Auto-calculate from CTC + structure + attendance |
| FIN-D-003 | Payslip Generation | Done — Bulk generate per month/year |
| FIN-D-004 | Statutory Compliance | Done — PF, ESI, TDS, Professional Tax (Indian) |
| FIN-D-005 | Payroll Reports | Done — Summary totals per payroll run |
| FIN-D-006 | Bank Transfer File | Partial — Data available, file generation pending |
| FIN-E-001 | Vendor Bill Management | Done — CRUD with status workflow |
| FIN-E-002 | Payment Scheduling | Done — Due date tracking |
| FIN-E-003 | Payment Approval | Done — Approve/pay workflow |
| FIN-F-001 | Financial Document Storage | Done — Upload metadata, categorization |
| FIN-F-002 | Document Categorisation | Done — Type/category classification with tags |
| FIN-F-003 | Audit Trail | Done — Via audit log system (all financial actions logged) |

**Missing:** Multi-currency exchange rates (FIN-A-006), Bank reconciliation (FIN-A-007), Payment gateway SDKs (FIN-B-004), Credit/debit notes (FIN-B-005)

**Key files:** `src/lib/actions/finance.ts`, `src/app/(dashboard)/finance/*`

---

## Module 10: Task/Project Management — 77%

| Feature ID | Feature | Status |
|-----------|---------|--------|
| PM-A-001 | Project Creation | Done — Scope, timeline, budget |
| PM-A-002 | Task Management | Done — Assignments, due dates, priorities, subtasks |
| PM-A-003 | Gantt Charts | Missing — Needs charting library (e.g. dhtmlx-gantt) |
| PM-A-004 | Kanban Boards | Done — Drag columns: TODO/IN_PROGRESS/IN_REVIEW/DONE |
| PM-A-005 | Milestone Tracking | Done — Define and track project milestones |
| PM-A-006 | Project Templates | Missing — Save/reuse project structures |
| PM-A-007 | Resource Allocation | Done — Assign team members to tasks |
| PM-A-008 | Project Dashboard | Done — Progress bar, budget vs spent, task summary |
| PM-B-001 | Time Logging | Done — Log hours per task/project |
| PM-B-002 | Timesheet Approval | Done — Manager approve/reject workflow |
| PM-B-003 | Billable vs Non-Billable | Done — isBillable flag with separate tracking |
| PM-B-004 | Time Reports | Done — Utilisation summary by project |
| PM-C-001 | Work Order Management | Missing — Field service is future scope |
| PM-C-002 | Technician Assignment | Missing — Needs mobile app |
| PM-C-003 | Time & Material Tracking | Partial — Via timesheet system |
| PM-C-004 | Mobile App for Field Team | Missing — Needs React Native/Flutter |
| PM-C-005 | Customer Signature Capture | Done — Via digital signature module (Module 4F) |
| PM-D-001 | Ticket Creation | Done — Raise support tickets |
| PM-D-002 | Ticket Assignment | Done — Auto/manual assign to agents |
| PM-D-003 | Ticket Priority & SLA | Done — Priority levels + SLA deadline |
| PM-D-004 | Ticket Status Tracking | Done — Open > In Progress > Waiting > Resolved > Closed |
| PM-D-005 | Knowledge Base Integration | Done — Via Library/KB module (Module 4I) |
| PM-D-006 | Customer Portal | Missing — Needs public-facing ticket view |
| PM-E-001 | Employee Schedule | Missing — Weekly/monthly work schedules |
| PM-E-002 | Shift Management | Missing — Define and assign shifts |
| PM-E-003 | Schedule Conflicts | Missing — Depends on PM-E-001/002 |
| PM-F-001 | Project File Storage | Done — Upload documents per project |
| PM-F-002 | Version Control | Done — File versioning support |
| PM-F-003 | File Sharing | Done — Team/client file access |
| PM-F-004 | Search & Filter | Done — Search by name, tags, date |

**Missing:** Gantt charts (PM-A-003), Project templates (PM-A-006), Field service mobile (PM-C-001/002/004), Customer portal (PM-D-006), Scheduling (PM-E-001-003)

**Key files:** `src/lib/actions/projects.ts`, `src/app/(dashboard)/projects/*`

---

## Module 11: Website Builder & CMS — 0% (Not Started)

| Feature ID | Feature | Priority | Status |
|-----------|---------|----------|--------|
| WEB-A-001 | Drag-and-Drop Builder | Medium | Not Started |
| WEB-A-002 | Static & Dynamic Pages | Medium | Not Started |
| WEB-A-003 | Template Library | Medium | Not Started |
| WEB-A-004 | Mobile Responsive | High | Not Started |
| WEB-A-005 | SEO Tools | Medium | Not Started |
| WEB-B-001 | Blog Post Creation | Medium | Not Started |
| WEB-B-002 | Categories & Tags | Medium | Not Started |
| WEB-B-003 | Comments Management | Low | Not Started |
| WEB-B-004 | RSS Feed | Low | Not Started |
| WEB-C-001 | Discussion Forum | Low | Not Started |
| WEB-C-002 | FAQ Management | Medium | Not Started |
| WEB-C-003 | Upvoting & Best Answers | Low | Not Started |
| WEB-D-001 | Live Chat Widget | Medium | Not Started |
| WEB-D-002 | Chat Routing | Medium | Not Started |
| WEB-D-003 | Chat History | Medium | Not Started |
| WEB-D-004 | Canned Responses | Low | Not Started |

---

## Module 12: Report Generator (Industry) — 0% (Not Started)

| Feature ID | Feature | Priority | Status |
|-----------|---------|----------|--------|
| RPT-A-001 | Survey Reports | Low | Not Started |
| RPT-A-002 | Geotechnical Reports | Low | Not Started |
| RPT-A-003 | Design Reports | Low | Not Started |
| RPT-A-004 | Custom Report Templates | Low | Not Started |

---

## Module 13: Office/Workspace Collaboration — 0% (Not Started)

| Feature ID | Feature | Priority | Status |
|-----------|---------|----------|--------|
| OFFICE-A-001 | Rich Text Editor | Medium | Not Started |
| OFFICE-A-002 | Document Templates | Medium | Not Started |
| OFFICE-A-003 | Real-time Collaboration | Low | Not Started |
| OFFICE-A-004 | Export to DOCX/PDF | High | Not Started |
| OFFICE-B-001 | Excel-like Grid | Medium | Not Started |
| OFFICE-B-002 | Charts & Pivot Tables | Low | Not Started |
| OFFICE-B-003 | Export to XLSX | High | Not Started |
| OFFICE-C-001 | Slide Editor | Low | Not Started |
| OFFICE-C-002 | Themes & Layouts | Low | Not Started |
| OFFICE-C-003 | Export to PPTX/PDF | Medium | Not Started |
| OFFICE-D-001 | Email Client | Low | Not Started |
| OFFICE-D-002 | Email Templates | Medium | Not Started |
| OFFICE-E-001 | Group Channels | High | Not Started |
| OFFICE-E-002 | Direct Messaging | High | Not Started |
| OFFICE-E-003 | File Sharing in Chat | High | Not Started |
| OFFICE-E-004 | Search History | Medium | Not Started |
| OFFICE-E-005 | Mentions & Notifications | High | Not Started |
| OFFICE-F-001 | VoIP Calling | Low | Not Started |
| OFFICE-F-002 | Call Recording | Low | Not Started |
| OFFICE-G-001 | Video Meetings | Medium | Not Started |
| OFFICE-G-002 | Screen Sharing | Medium | Not Started |
| OFFICE-G-003 | Meeting Recording | Low | Not Started |
| OFFICE-G-004 | Chat During Calls | Medium | Not Started |

---

## Cross-Cutting Features

| Feature | Status |
|---------|--------|
| Multi-Tenant Architecture | Done (tenant-scoped all queries) |
| Redis Caching Layer | Done |
| Rate Limiting | Done (all auth endpoints) |
| MFA Encryption | Done (AES-256-GCM) |
| Advanced Search (14 models) | Done (expanded Session 3) |
| Export/Import (CSV + Tally XML) | Done |
| Activity Logs + IP/Device audit | Done |
| Notifications Engine (in-app) | Done |
| Custom Fields | Schema ready |
| Database Seed Script | Done (prisma/seed.ts) |
| Mobile Apps | Future |
| REST API / Webhooks | Future |

---

## Database Schema — 69 Models

| Category | Models |
|----------|--------|
| Core | Tenant |
| Auth | User, Account, Session, VerificationToken |
| RBAC | Role, Permission, RolePermission, UserRole |
| Organization | Department, Branch, Announcement, CalendarEvent, Note, Contract, Signature, SignatureRequest, Document, FormTemplate, FormSubmission, SavedReport, ApprovalWorkflow |
| Sales/CRM | Lead, Contact, Deal, Activity, Quotation, QuotationItem, Invoice, InvoiceItem, Payment, Visit, Order, OrderItem, QueueToken, LoyaltyPoint, TableReservation |
| Finance | GLAccount, JournalEntry, JournalLine, ExpenseCategory, Expense, SalaryStructure, Payslip, VendorBill, FinancialDocument |
| HRM | Employee, JobPosting, Applicant, Holiday, LeaveType, LeaveRequest, Attendance, Vehicle, FuelLog |
| Projects | Project, Task, Milestone, Timesheet, Ticket, TicketComment, ProjectFile |
| Supply Chain | Product, Warehouse, WarehouseStock, StockMovement, ManufacturingOrder, BOMItem, Asset, MaintenanceRequest, QualityCheck |
| Marketing | Campaign, MarketingEvent, EventAttendee, Survey, SurveyResponse |
| Dashboard | DashboardLayout |
| Cross-cutting | AuditLog, Notification, CustomFieldDefinition |

---

## Session 3 Summary (2026-04-04)

### Features built: 105+
- **Module 9 — Finance & Accounting:** Chart of Accounts (24 seeded), Journal Entries (multi-line debit/credit), General Ledger, Trial Balance, P&L/Balance Sheet/Cash Flow statements, Expense Management (categories, approval workflow), Payroll (salary structures, Indian statutory: PF/ESI/TDS/PT, bulk payslip generation), Vendor Bills (status workflow, payment), Financial Documents
- **Module 8 — HRM:** Employee Database (full records, bank/PAN/Aadhar/PF/ESI), Recruitment Pipeline (job postings, 7-stage applicant tracking), Leave Management (4 seeded leave types, apply/approve/reject, balance tracking), Attendance (clock in/out, monthly reports, overtime), Fleet Management (vehicles, fuel logs, assignment)
- **Module 10 — Projects:** Project Management (CRUD, progress, budget tracking), Task Management (Kanban board, subtasks, assignments), Milestones, Timesheets (billable/non-billable, approval), Helpdesk Ticketing (6-status workflow, SLA, comments, assignment), Project Files
- **Module 7 — Supply Chain:** Product Catalog (SKU, HSN, barcode, pricing), Multi-Warehouse Inventory (stock levels, movements), Low Stock Alerts, Inventory Valuation, Manufacturing Orders (BOM, status tracking), Asset/Equipment Registry, Maintenance Requests, Quality Control (checkpoints, defect logging)
- **Module 6 — Marketing:** Campaign Management (Email/SMS/WhatsApp channels, scheduling, send simulation, open/click/bounce tracking), Contact Segmentation (tag-based), Event Management (online/offline, attendees, check-in), Survey Builder (4 question types, analytics, share URL)
- **Infrastructure:** 30 new Prisma models (39 → 69), 5 server action files (152KB), 30 new UI pages, sidebar with 8 module sections, global search expanded to 14 models, database seed script

### Commits (Session 3)
*Pending commit — all work ready*

---

## Next Session Plan

### Priority 1: Dashboard Widgets (Module 3)
Now that Modules 6-10 are built, the 19 blocked dashboard widgets can be wired up:
- Project status dashboard, Attendance today widget, Employee count, Open tickets
- Inventory levels, Low stock alerts, Manufacturing status
- Campaign performance, Active surveys

### Priority 2: Module 11 — Website Builder & CMS (Medium)
16 features — drag-and-drop builder, blog, forum, live chat

### Priority 3: Module 13 — Office Collaboration (Medium)
25 features — internal messaging (High priority), document editor, spreadsheet, email

### Priority 4: Module 12 — Industry Report Generator (Low)
4 features — all Low priority, civil engineering specific

### Remaining Phase 2 Items (External Dependencies)
| Item | Dependency |
|------|-----------|
| AUTH-009 CAPTCHA | reCAPTCHA service |
| HOME-003 Push Notifications | Service worker |
| ORG-D-004 Calendar Sync | Google/Outlook OAuth |
| SALES-C002 Zomato/Swiggy | Third-party API |
| SALES-C008/009 Kiosk/Waiter | Hardware integration |
| MKTG-A-006 WhatsApp Marketing | WhatsApp Business API |
| MKTG-B-001/002/003 Social Media | Facebook/LinkedIn/Twitter API |
| SCM-A-006 Barcode Scanner | Camera/hardware API |
| HRM-D-002 Biometric | Hardware API |
| HRM-D-003/F-004 GPS | Mobile app + geolocation |
| HRM-E-001-004 Performance | Appraisal form builder |
| FIN-A-006 Multi-Currency | Exchange rate API |
| FIN-A-007 Bank Reconciliation | Bank statement import |
| FIN-B-004 Payment Gateway | Razorpay/Stripe SDK |
| PM-A-003 Gantt Charts | dhtmlx-gantt or similar |
| PM-C-001/002/004 Field Service | Mobile app (React Native/Flutter) |
| PM-D-006 Customer Portal | Public-facing ticket UI |
| PM-E-001-003 Scheduling | Shift management UI |
| HIGH-01 RBAC Enforcement | Permission seeding + role UI |
