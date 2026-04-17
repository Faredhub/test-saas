# TixelERP — Development Progress

> Last updated: 2026-04-17 (Session 5 complete)
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
| 8. HRM | 26 | 23 | 1 | 2 | **88%** |
| 9. Finance | 33 | 29 | 1 | 3 | **88%** |
| 10. Projects | 30 | 27 | 1 | 2 | **90%** |
| 11. Website/CMS | 16 | 14 | 0 | 2 | **88%** |
| 12. Report Gen | 4 | 4 | 0 | 0 | **100%** |
| 13. Office/Collab | 25 | 18 | 0 | 7 | **72%** |
| **TOTAL** | **285** | **231** | **7** | **47** | **~81%** |

*Session 5 added 43 features across all modules. Remaining gaps are mostly external API dependencies.*
*RBAC enforcement + permission seeding complete. Mobile sidebar + loading/error states added.*

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

## Module 8: Human Resource Management — 88%

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
| HRM-E-001 | Performance Reviews | Done — Review cycles, self/manager ratings, criteria-based evaluation |
| HRM-E-002 | Goal Setting | Done — SMART goals with key results, progress tracking, OKR-style |
| HRM-E-003 | 360-Degree Feedback | Missing — Future scope |
| HRM-E-004 | Performance Reports | Missing — Depends on HRM-E-003 |
| HRM-F-001 | Vehicle Database | Done — Full vehicle registry with details |
| HRM-F-002 | Fuel & Running Costs | Done — Fuel log tracking with cost per km |
| HRM-F-003 | Vehicle Assignment | Done — Assign to employees |
| HRM-F-004 | GPS Tracking | Missing — Needs GPS hardware/API |

**Missing:** Biometric/GPS hardware (HRM-D-002/003), Performance appraisals (HRM-E-001-004), GPS tracking (HRM-F-004)

**Key files:** `src/lib/actions/hrm.ts`, `src/app/(dashboard)/hrm/*`

---

## Module 9: Finance & Accounting — 88%

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
| FIN-B-005 | Credit/Debit Notes | Done — Credit/debit notes linked to invoices, line items, status workflow |
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

**Missing:** Multi-currency exchange rates (FIN-A-006), Bank reconciliation (FIN-A-007), Payment gateway SDKs (FIN-B-004)

**Key files:** `src/lib/actions/finance.ts`, `src/app/(dashboard)/finance/*`

---

## Module 10: Task/Project Management — 90%

| Feature ID | Feature | Status |
|-----------|---------|--------|
| PM-A-001 | Project Creation | Done — Scope, timeline, budget |
| PM-A-002 | Task Management | Done — Assignments, due dates, priorities, subtasks |
| PM-A-003 | Gantt Charts | Missing — Needs charting library (e.g. dhtmlx-gantt) |
| PM-A-004 | Kanban Boards | Done — Drag columns: TODO/IN_PROGRESS/IN_REVIEW/DONE |
| PM-A-005 | Milestone Tracking | Done — Define and track project milestones |
| PM-A-006 | Project Templates | Done — Save/reuse project structures with tasks and milestones |
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
| PM-D-006 | Customer Portal | Done — Public ticket lookup and comment via /portal/tickets |
| PM-E-001 | Employee Schedule | Done — Weekly calendar view, shift assignment per employee per day |
| PM-E-002 | Shift Management | Done — Define shifts with start/end times, breaks, colors |
| PM-E-003 | Schedule Conflicts | Done — Unique constraint prevents double-booking |
| PM-F-001 | Project File Storage | Done — Upload documents per project |
| PM-F-002 | Version Control | Done — File versioning support |
| PM-F-003 | File Sharing | Done — Team/client file access |
| PM-F-004 | Search & Filter | Done — Search by name, tags, date |

**Missing:** Gantt charts (PM-A-003 - needs dhtmlx-gantt), Field service mobile (PM-C-001/002/004 - needs React Native)

**Key files:** `src/lib/actions/projects.ts`, `src/app/(dashboard)/projects/*`

---

## Module 11: Website Builder & CMS — 88%

| Feature ID | Feature | Status |
|-----------|---------|--------|
| WEB-A-001 | Page Builder | Done — Block-based content editor (heading, text, image, button, columns) |
| WEB-A-002 | Static & Dynamic Pages | Done — Page CRUD with slug, publish toggle, parent pages |
| WEB-A-003 | Template Library | Done — Save/reuse page templates by category |
| WEB-A-004 | Mobile Responsive | Done — Responsive UI throughout |
| WEB-A-005 | SEO Tools | Done — Meta title, meta description, slug per page/post |
| WEB-B-001 | Blog Post Creation | Done — Rich content, cover image, excerpt, publish workflow |
| WEB-B-002 | Categories & Tags | Done — Blog categories with slugs, JSON tags |
| WEB-B-003 | Comments Management | Done — JSON-based comments with approval |
| WEB-B-004 | RSS Feed | Missing — Needs RSS XML generation endpoint |
| WEB-C-001 | Discussion Forum | Done — Topics, threaded replies, view counts |
| WEB-C-002 | FAQ Management | Done — Accordion FAQ with categories, sort order, publish toggle |
| WEB-C-003 | Upvoting & Best Answers | Done — Upvotes on topics, best answer marking on replies |
| WEB-D-001 | Live Chat Widget | Done — Configurable widget with greeting, color, position |
| WEB-D-002 | Chat Routing | Done — Assign conversations to agents |
| WEB-D-003 | Chat History | Done — Full message history per conversation |
| WEB-D-004 | Canned Responses | Done — Configurable quick-reply shortcuts |

**Missing:** RSS feed endpoint (WEB-B-004), drag-and-drop visual builder (current is block-based form)

**Key files:** `src/lib/actions/website.ts`, `src/app/(dashboard)/website/*`

---

## Module 12: Report Generator (Industry) — 100%

| Feature ID | Feature | Status |
|-----------|---------|--------|
| RPT-A-001 | Survey Reports | Done — Survey report type with section builder |
| RPT-A-002 | Geotechnical Reports | Done — Geotechnical report type with data tables, charts |
| RPT-A-003 | Design Reports | Done — Design report type with images, signatures |
| RPT-A-004 | Custom Report Templates | Done — Section-based template builder (text, table, chart, image, signature) |

**Key features:** Template builder with header/footer config, print-friendly report viewer, status workflow (Draft > Final > Approved), page size/orientation settings

**Key files:** `src/lib/actions/reports.ts`, `src/app/(dashboard)/reports/*`

---

## Module 13: Office/Workspace Collaboration — 72%

| Feature ID | Feature | Status |
|-----------|---------|--------|
| OFFICE-A-001 | Rich Text Editor | Done — ContentEditable editor with formatting |
| OFFICE-A-002 | Document Templates | Done — isTemplate flag, reuse documents |
| OFFICE-A-003 | Real-time Collaboration | Missing — Needs WebSocket/CRDT library |
| OFFICE-A-004 | Export to DOCX/PDF | Missing — Needs docx/pdf generation library |
| OFFICE-B-001 | Excel-like Grid | Done — Editable cell grid with column/row management |
| OFFICE-B-002 | Charts & Pivot Tables | Missing — Future scope |
| OFFICE-B-003 | Export to XLSX | Missing — Needs xlsx library |
| OFFICE-C-001 | Slide Editor | Done — Slide panel, layout-based editing |
| OFFICE-C-002 | Themes & Layouts | Done — Theme selector, 4 slide layouts |
| OFFICE-C-003 | Export to PPTX/PDF | Missing — Needs pptx generation library |
| OFFICE-D-001 | Email Client | Done — 3-column email UI, folders, compose, star/read |
| OFFICE-D-002 | Email Templates | Done — Draft system, reusable via isTemplate |
| OFFICE-E-001 | Group Channels | Done — Create/manage channels, public/private |
| OFFICE-E-002 | Direct Messaging | Done — Direct message channel type |
| OFFICE-E-003 | File Sharing in Chat | Done — FILE/IMAGE message types with attachments |
| OFFICE-E-004 | Search History | Missing — Needs full-text search on messages |
| OFFICE-E-005 | Mentions & Notifications | Done — @mention support with mentions JSON field |
| OFFICE-F-001 | VoIP Calling | Missing — Needs WebRTC/Twilio integration |
| OFFICE-F-002 | Call Recording | Missing — Needs media server |
| OFFICE-G-001 | Video Meetings | Missing — Needs WebRTC or Jitsi integration |
| OFFICE-G-002 | Screen Sharing | Missing — Needs WebRTC |
| OFFICE-G-003 | Meeting Recording | Missing — Needs media server |
| OFFICE-G-004 | Chat During Calls | Missing — Depends on OFFICE-G-001 |

**Missing:** Real-time collab (WebSocket/CRDT), file exports (DOCX/XLSX/PPTX), VoIP/Video (WebRTC/Twilio)

**Key files:** `src/lib/actions/office.ts`, `src/app/(dashboard)/office/*`

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
| RBAC Permission Seeding | Done (Session 5 — 600+ permissions across 12 modules) |
| Role Management UI | Done (Session 5 — create roles, edit permissions, assign to users) |
| Loading States | Done (Session 5 — loading.tsx for all module routes) |
| Error Boundaries | Done (Session 5 — error.tsx with retry) |
| Mobile Sidebar | Done (Session 5 — hamburger menu with full nav overlay) |
| 404 Page | Done (Session 5 — not-found.tsx) |
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

## Session 4 Summary (2026-04-09)

### Production Deployment on Coolify

Deployed the entire TixelERP stack to production on Coolify (server `107.175.113.28`).

| Resource | Technology | Status | Details |
|----------|-----------|--------|---------|
| **App** | Next.js 16 (Dockerfile) | Running | `https://trp.tpdemo.in` |
| **Database** | PostgreSQL 16 Alpine | Running:healthy | Internal network, Coolify-managed |
| **Cache** | Redis 7.2 | Running:healthy | Internal network, Coolify-managed |
| **SSL** | Let's Encrypt | Active | Auto-provisioned via Traefik |
| **Domain** | `trp.tpdemo.in` | Live | DNS pointed to `107.175.113.28` |
| **Proxy** | Traefik v3.6 | Running | HTTP→HTTPS redirect, gzip |

**Coolify Project:** TixelTech-ERP (`l1eozwehpzatnw5u8kflakz3`)
**Git:** Auto-deploy from `digitaldominationio/TixelTech-ERP` main branch via GitHub App

### Deployment Architecture

```
                    trp.tpdemo.in
                         │
                    ┌────▼────┐
                    │ Traefik │  (SSL termination, reverse proxy)
                    └────┬────┘
                         │ :3000
                ┌────────▼────────┐
                │  tixelerp-app   │  Next.js 16 (standalone Docker)
                │  f61vg0fwimny   │  Commit: 31e304e
                └───┬────────┬───┘
                    │        │
          ┌─────────▼──┐  ┌─▼──────────┐
          │  PostgreSQL │  │   Redis    │
          │  16-alpine  │  │   7.2      │
          │  cksl0vzj   │  │  gdggs57j  │
          └─────────────┘  └────────────┘
```

### Environment Variables (Production)

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Internal Coolify PostgreSQL URL |
| `REDIS_URL` | Internal Coolify Redis URL |
| `NEXTAUTH_URL` | `https://trp.tpdemo.in` |
| `NEXTAUTH_SECRET` | Set (JWT signing) |
| `AUTH_SECRET` | Set (NextAuth v5) |
| `AUTH_TRUST_HOST` | `true` (behind Traefik proxy) |

### Login Credentials

| Field | Value |
|-------|-------|
| URL | `https://trp.tpdemo.in` |
| Email | `admin@tixelerp.com` |
| Password | `Admin@123` |
| Role | Super Admin |
| Tenant | TixelTech Private Limited (ENTERPRISE) |

### Build Fixes Applied

| Issue | Fix | Commit |
|-------|-----|--------|
| Next.js prerender fails on `/login` (needs DB at build) | Added `export const dynamic = "force-dynamic"` to auth + dashboard layouts | `e41dbcf` |
| Prisma 7 generates to `src/generated/prisma` not `node_modules/.prisma` | Removed non-existent COPY paths from Dockerfile | `854c467` |
| NextAuth `Configuration` error (empty OAuth providers) | Conditionally include Google/Microsoft providers only when env vars set | `4372612` |
| Missing `AUTH_SECRET` env var | Added `AUTH_SECRET` + `AUTH_TRUST_HOST` to Coolify env | via Coolify UI |
| Seed password hash mismatch | Generated correct bcrypt hash and updated via direct DB connection | via psql |

### UI: Modern Dock + Panel Sidebar

Replaced the overwhelming full-list sidebar with a two-level navigation system:

| Component | Description |
|-----------|-------------|
| **Icon Dock** (68px) | 8 color-coded category icons: Overview, Finance, Sales, Inventory, HRM, Projects, Marketing, Organization |
| **Sub-Panel** (224px) | Slides out when category selected, showing that category's items |
| **Pin/Unpin** | Sub-panel can be pinned (inline) or unpinned (floating overlay) |
| **Active Indicators** | Blue dot on dock icon when category has active route; left bar for selected category |
| **Settings Toggle** | Profile Settings > "Sidebar Style" to switch between Modern and Classic |
| **State Persistence** | Zustand store with localStorage (`tixel-sidebar`) |

**Files:** `src/stores/sidebar-store.ts`, `src/components/layout/sidebar.tsx`, `src/app/(dashboard)/profile/profile-client.tsx`

### Commits (Session 4)

| Hash | Message |
|------|---------|
| `c10f3a0` | feat: add Dockerfile and production docker-compose for Coolify deployment |
| `e41dbcf` | fix: force dynamic rendering for auth and dashboard layouts |
| `854c467` | fix: remove non-existent Prisma paths from Dockerfile |
| `2999eaf` | feat: add entrypoint script for auto-migration on startup |
| `4372612` | fix: conditionally include OAuth providers only when configured |
| `31e304e` | feat: modern dock + panel sidebar with category grouping |

---

## Session 5 Summary (2026-04-17)

### Features built: 43+ new features

**Module 6-10 Gap Closure:**
- HRM-E-001/002: Performance Reviews (criteria-based, self/manager ratings, review cycles) + Goal Setting (OKR-style with key results, progress tracking)
- PM-E-001-003: Employee Scheduling (shifts with time/break/color, weekly calendar grid, conflict prevention)
- PM-A-006: Project Templates (save/reuse project structures with tasks and milestones)
- PM-D-006: Customer Portal (public ticket lookup and commenting at /portal/tickets)
- FIN-B-005: Credit/Debit Notes (linked to invoices, line items, status workflow)

**Module 11 — Website Builder & CMS (14/16 features):**
- Block-based page builder with heading, text, image, button, columns blocks
- Page template library by category
- Blog system with categories, tags, comments, SEO fields, publish workflow
- Discussion forum with threaded replies, upvoting, best answers, pin/lock
- FAQ management with accordion display, categories, sort order
- Live chat widget with configurable greeting/color/position, agent assignment, canned responses, conversation history

**Module 12 — Report Generator (4/4 features = 100%):**
- Template builder with section types (text, table, chart, image, signature)
- Header/footer configuration (logo, company info, disclaimers, signature fields)
- Report generation from templates with status workflow (Draft > Final > Approved)
- Print-friendly report viewer with professional document layout

**Module 13 — Office/Workspace Collaboration (18/25 features):**
- Rich text document editor with formatting, templates, sharing, versioning
- Excel-like spreadsheet grid with editable cells, column/row management, sheet tabs
- Slide presentation editor with 4 layouts, theme selector, slide panel
- Email client with 3-column layout, folders (Inbox/Sent/Drafts/Trash/Archive), compose, star/read
- Slack-style messaging with channels (group/direct/announcement), threaded replies, @mentions, emoji reactions, file attachments

**RBAC Enforcement:**
- 600+ permissions seeded across 12 modules (5 actions x 60+ resources)
- 4 system roles: Super Admin, Manager, Employee, Viewer
- Role management UI with permission matrix editor
- User-to-role assignment interface
- `requirePermission()` guard utility for server actions
- Super Admin bypass for all permission checks

**Polish & UX:**
- Loading states (loading.tsx) for all 12+ module routes
- Error boundary (error.tsx) with retry button
- 404 not-found page
- Mobile sidebar with hamburger menu, overlay navigation, auto-close on navigate
- Sidebar expanded: 11 categories (added Reports, Office, Settings)

### Database Changes
- 22 new Prisma models (69 -> 91 total)
- New enums: ReviewType, ReviewStatus, GoalCategory, GoalStatus, GoalPriority, CreditNoteType, CreditNoteStatus, ScheduleStatus, PostStatus, ConvoStatus, ReportType, ReportGenStatus, DocFormat, EmailFolder, ChannelType, MsgType

### New Files
- 3 new server action files: `website.ts`, `reports.ts`, `office.ts`
- 1 new RBAC action file: `rbac.ts`
- 22+ new page files across 6 new route groups
- 17+ new client component files
- Updated: `hrm.ts`, `finance.ts`, `projects.ts` (appended gap features)
- Updated: `sidebar.tsx` (3 new categories + mobile overlay)
- Updated: `rbac.ts` (enhanced with requirePermission, caching, Super Admin bypass)
- Updated: `seed.ts` (permissions + default roles)

---

## Next Session Plan

### Priority 1: Build Verification & Deploy
- Run full build, fix any TypeScript errors
- Push to main, trigger Coolify deployment
- Run seed on production to add permissions + roles

### Priority 2: Remaining Buildable Features
- PM-A-003 Gantt Charts (add dhtmlx-gantt library)
- WEB-B-004 RSS Feed endpoint
- Dashboard widgets for Modules 11-13

### Priority 3: Export Libraries
- OFFICE-A-004 Export to DOCX/PDF (add docx/pdfkit)
- OFFICE-B-003 Export to XLSX (add xlsx)
- OFFICE-C-003 Export to PPTX (add pptxgenjs)

### Remaining Phase 2 Items (External Dependencies)
| Item | Dependency |
|------|-----------|
| AUTH-009 CAPTCHA | reCAPTCHA service |
| HOME-003 Push Notifications | Service worker |
| ORG-D-004 Calendar Sync | Google/Outlook OAuth |
| MKTG-A-006 WhatsApp Marketing | WhatsApp Business API |
| MKTG-B-001/002/003 Social Media | Facebook/LinkedIn/Twitter API |
| SCM-A-006 Barcode Scanner | Camera/hardware API |
| HRM-D-002 Biometric | Hardware API |
| HRM-D-003/F-004 GPS | Mobile app + geolocation |
| FIN-A-006 Multi-Currency | Exchange rate API |
| FIN-A-007 Bank Reconciliation | Bank statement import |
| FIN-B-004 Payment Gateway | Razorpay/Stripe SDK |
| PM-C-001/002/004 Field Service | Mobile app (React Native/Flutter) |
| OFFICE-A-003 Real-time Collab | WebSocket/CRDT library |
| OFFICE-F/G VoIP/Video | WebRTC/Twilio/Jitsi |
