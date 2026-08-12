-- ============================================================
-- TixelERP Data Reset Script
-- Backs up nothing (run backup first!); clears all business data
-- KEEPS: tenants, superadmin users, system roles, permissions, RBAC
-- ============================================================
BEGIN;

-- 1. Delete non-superadmin users (keep Super Admin / Admin users)
--    Superadmin = users assigned to a role named 'Super Admin' or 'Admin'
DELETE FROM user_roles
  WHERE role_id NOT IN (SELECT id FROM roles WHERE name IN ('Super Admin','Admin'));

DELETE FROM users
  WHERE id NOT IN (
    SELECT DISTINCT ur.user_id FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE r.name IN ('Super Admin','Admin')
  );

-- 2. Delete non-system roles
DELETE FROM role_permissions WHERE role_id NOT IN (SELECT id FROM roles WHERE "isSystem" = true);
DELETE FROM roles WHERE "isSystem" = false;

-- 3. Truncate all business-data tables
TRUNCATE TABLE "activities" CASCADE;
TRUNCATE TABLE "announcements" CASCADE;
TRUNCATE TABLE "applicants" CASCADE;
TRUNCATE TABLE "approval_workflows" CASCADE;
TRUNCATE TABLE "assets" CASCADE;
TRUNCATE TABLE "attendance" CASCADE;
TRUNCATE TABLE "audit_logs" CASCADE;
TRUNCATE TABLE "bids" CASCADE;
TRUNCATE TABLE "blog_categories" CASCADE;
TRUNCATE TABLE "blog_posts" CASCADE;
TRUNCATE TABLE "bom_items" CASCADE;
TRUNCATE TABLE "boq_items" CASCADE;
TRUNCATE TABLE "borehole_layers" CASCADE;
TRUNCATE TABLE "borehole_tests" CASCADE;
TRUNCATE TABLE "boreholes" CASCADE;
TRUNCATE TABLE "branches" CASCADE;
TRUNCATE TABLE "calendar_events" CASCADE;
TRUNCATE TABLE "call_sessions" CASCADE;
TRUNCATE TABLE "campaigns" CASCADE;
TRUNCATE TABLE "cart_items" CASCADE;
TRUNCATE TABLE "carts" CASCADE;
TRUNCATE TABLE "chat_channels" CASCADE;
TRUNCATE TABLE "chat_conversations" CASCADE;
TRUNCATE TABLE "chat_messages" CASCADE;
TRUNCATE TABLE "chat_widgets" CASCADE;
TRUNCATE TABLE "contacts" CASCADE;
TRUNCATE TABLE "contracts" CASCADE;
TRUNCATE TABLE "credit_notes" CASCADE;
TRUNCATE TABLE "custom_domains" CASCADE;
TRUNCATE TABLE "custom_field_definitions" CASCADE;
TRUNCATE TABLE "customer_pricing_rules" CASCADE;
TRUNCATE TABLE "cv_records" CASCADE;
TRUNCATE TABLE "dashboard_layouts" CASCADE;
TRUNCATE TABLE "deals" CASCADE;
TRUNCATE TABLE "delivery_items" CASCADE;
TRUNCATE TABLE "delivery_orders" CASCADE;
TRUNCATE TABLE "departments" CASCADE;
TRUNCATE TABLE "designation_roles" CASCADE;
TRUNCATE TABLE "designations" CASCADE;
TRUNCATE TABLE "dns_records" CASCADE;
TRUNCATE TABLE "documents" CASCADE;
TRUNCATE TABLE "ecommerce_order_items" CASCADE;
TRUNCATE TABLE "ecommerce_orders" CASCADE;
TRUNCATE TABLE "email_accounts" CASCADE;
TRUNCATE TABLE "email_messages" CASCADE;
TRUNCATE TABLE "emd_records" CASCADE;
TRUNCATE TABLE "employees" CASCADE;
TRUNCATE TABLE "event_attendees" CASCADE;
TRUNCATE TABLE "expense_categories" CASCADE;
TRUNCATE TABLE "expenses" CASCADE;
TRUNCATE TABLE "faq_items" CASCADE;
TRUNCATE TABLE "field_visit_schedules" CASCADE;
TRUNCATE TABLE "finance_ledgers" CASCADE;
TRUNCATE TABLE "financial_documents" CASCADE;
TRUNCATE TABLE "form_submissions" CASCADE;
TRUNCATE TABLE "form_templates" CASCADE;
TRUNCATE TABLE "forum_topics" CASCADE;
TRUNCATE TABLE "fuel_logs" CASCADE;
TRUNCATE TABLE "generated_reports" CASCADE;
TRUNCATE TABLE "gl_accounts" CASCADE;
TRUNCATE TABLE "goals" CASCADE;
TRUNCATE TABLE "holidays" CASCADE;
TRUNCATE TABLE "industry_templates" CASCADE;
TRUNCATE TABLE "invoice_items" CASCADE;
TRUNCATE TABLE "invoices" CASCADE;
TRUNCATE TABLE "job_postings" CASCADE;
TRUNCATE TABLE "journal_entries" CASCADE;
TRUNCATE TABLE "journal_lines" CASCADE;
TRUNCATE TABLE "kiosk_terminals" CASCADE;
TRUNCATE TABLE "leads" CASCADE;
TRUNCATE TABLE "leave_requests" CASCADE;
TRUNCATE TABLE "leave_types" CASCADE;
TRUNCATE TABLE "lot_serial_numbers" CASCADE;
TRUNCATE TABLE "loyalty_points" CASCADE;
TRUNCATE TABLE "maintenance_requests" CASCADE;
TRUNCATE TABLE "manufacturing_orders" CASCADE;
TRUNCATE TABLE "marketing_events" CASCADE;
TRUNCATE TABLE "milestones" CASCADE;
TRUNCATE TABLE "notes" CASCADE;
TRUNCATE TABLE "notifications" CASCADE;
TRUNCATE TABLE "office_documents" CASCADE;
TRUNCATE TABLE "order_items" CASCADE;
TRUNCATE TABLE "orders" CASCADE;
TRUNCATE TABLE "page_templates" CASCADE;
TRUNCATE TABLE "payments" CASCADE;
TRUNCATE TABLE "payslips" CASCADE;
TRUNCATE TABLE "performance_reviews" CASCADE;
TRUNCATE TABLE "presentations" CASCADE;
TRUNCATE TABLE "product_variants" CASCADE;
TRUNCATE TABLE "products" CASCADE;
TRUNCATE TABLE "project_files" CASCADE;
TRUNCATE TABLE "project_templates" CASCADE;
TRUNCATE TABLE "projects" CASCADE;
TRUNCATE TABLE "purchase_orders" CASCADE;
TRUNCATE TABLE "quality_checks" CASCADE;
TRUNCATE TABLE "queue_tokens" CASCADE;
TRUNCATE TABLE "quotation_items" CASCADE;
TRUNCATE TABLE "quotations" CASCADE;
TRUNCATE TABLE "report_templates" CASCADE;
TRUNCATE TABLE "salary_structures" CASCADE;
TRUNCATE TABLE "sales_team_members" CASCADE;
TRUNCATE TABLE "sales_teams" CASCADE;
TRUNCATE TABLE "saved_reports" CASCADE;
TRUNCATE TABLE "schedule_entries" CASCADE;
TRUNCATE TABLE "shifts" CASCADE;
TRUNCATE TABLE "signature_requests" CASCADE;
TRUNCATE TABLE "signatures" CASCADE;
TRUNCATE TABLE "soil_samples" CASCADE;
TRUNCATE TABLE "spreadsheets" CASCADE;
TRUNCATE TABLE "stock_movements" CASCADE;
TRUNCATE TABLE "survey_responses" CASCADE;
TRUNCATE TABLE "surveys" CASCADE;
TRUNCATE TABLE "table_reservations" CASCADE;
TRUNCATE TABLE "tasks" CASCADE;
TRUNCATE TABLE "tenant_mail_servers" CASCADE;
TRUNCATE TABLE "tenders" CASCADE;
TRUNCATE TABLE "ticket_comments" CASCADE;
TRUNCATE TABLE "tickets" CASCADE;
TRUNCATE TABLE "timesheets" CASCADE;
TRUNCATE TABLE "trips" CASCADE;
TRUNCATE TABLE "vehicles" CASCADE;
TRUNCATE TABLE "vendor_bills" CASCADE;
TRUNCATE TABLE "vendor_products" CASCADE;
TRUNCATE TABLE "vendors" CASCADE;
TRUNCATE TABLE "verification_tokens" CASCADE;
TRUNCATE TABLE "visits" CASCADE;
TRUNCATE TABLE "waiter_calls" CASCADE;
TRUNCATE TABLE "warehouse_stock" CASCADE;
TRUNCATE TABLE "warehouses" CASCADE;
TRUNCATE TABLE "web_pages" CASCADE;
TRUNCATE TABLE "website_themes" CASCADE;

COMMIT;
