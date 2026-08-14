-- CreateTable: purchase_order_items
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "unit" TEXT DEFAULT 'PCS',
    "unitPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add relational columns
ALTER TABLE "projects" ADD COLUMN "clientId" TEXT;
ALTER TABLE "manufacturing_orders" ADD COLUMN "productId" TEXT;
ALTER TABLE "finance_ledgers" ADD COLUMN "projectId" TEXT;
ALTER TABLE "finance_ledgers" ADD COLUMN "employeeId" TEXT;
ALTER TABLE "finance_ledgers" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "delivery_orders" ADD COLUMN "contactId" TEXT;
ALTER TABLE "field_visit_schedules" ADD COLUMN "clientId" TEXT;
ALTER TABLE "office_documents" ADD COLUMN "projectId" TEXT;
ALTER TABLE "spreadsheets" ADD COLUMN "projectId" TEXT;
ALTER TABLE "presentations" ADD COLUMN "projectId" TEXT;
ALTER TABLE "generated_reports" ADD COLUMN "projectId" TEXT;
ALTER TABLE "generated_reports" ADD COLUMN "clientId" TEXT;
ALTER TABLE "quality_checks" ADD COLUMN "productId" TEXT;
ALTER TABLE "quality_checks" ADD COLUMN "inspectorId" TEXT;
ALTER TABLE "assets" ADD COLUMN "assignedToId" TEXT;
ALTER TABLE "maintenance_requests" ADD COLUMN "assignedToId" TEXT;

-- Data cleanup: null out any orphan references before adding FK constraints
UPDATE "employees" SET "userId" = NULL WHERE "userId" IS NOT NULL AND "userId" NOT IN (SELECT "id" FROM "users");
UPDATE "employees" SET "departmentId" = NULL WHERE "departmentId" IS NOT NULL AND "departmentId" NOT IN (SELECT "id" FROM "departments");
UPDATE "tasks" SET "assigneeId" = NULL WHERE "assigneeId" IS NOT NULL AND "assigneeId" NOT IN (SELECT "id" FROM "employees");
UPDATE "cv_records" SET "employeeId" = NULL WHERE "employeeId" IS NOT NULL AND "employeeId" NOT IN (SELECT "id" FROM "employees");
UPDATE "expenses" SET "approvedById" = NULL WHERE "approvedById" IS NOT NULL AND "approvedById" NOT IN (SELECT "id" FROM "users");
UPDATE "vendor_bills" SET "approvedById" = NULL WHERE "approvedById" IS NOT NULL AND "approvedById" NOT IN (SELECT "id" FROM "users");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");
CREATE INDEX "projects_clientId_idx" ON "projects"("clientId");
CREATE INDEX "manufacturing_orders_productId_idx" ON "manufacturing_orders"("productId");
CREATE INDEX "finance_ledgers_projectId_idx" ON "finance_ledgers"("projectId");
CREATE INDEX "finance_ledgers_employeeId_idx" ON "finance_ledgers"("employeeId");
CREATE INDEX "finance_ledgers_vendorId_idx" ON "finance_ledgers"("vendorId");
CREATE INDEX "delivery_orders_contactId_idx" ON "delivery_orders"("contactId");
CREATE INDEX "field_visit_schedules_clientId_idx" ON "field_visit_schedules"("clientId");
CREATE INDEX "office_documents_projectId_idx" ON "office_documents"("projectId");
CREATE INDEX "spreadsheets_projectId_idx" ON "spreadsheets"("projectId");
CREATE INDEX "presentations_projectId_idx" ON "presentations"("projectId");
CREATE INDEX "generated_reports_projectId_idx" ON "generated_reports"("projectId");
CREATE INDEX "generated_reports_clientId_idx" ON "generated_reports"("clientId");
CREATE INDEX "quality_checks_productId_idx" ON "quality_checks"("productId");
CREATE INDEX "quality_checks_inspectorId_idx" ON "quality_checks"("inspectorId");
CREATE INDEX "assets_assignedToId_idx" ON "assets"("assignedToId");
CREATE INDEX "maintenance_requests_assignedToId_idx" ON "maintenance_requests"("assignedToId");
CREATE INDEX "employees_userId_idx" ON "employees"("userId");
CREATE INDEX "employees_departmentId_idx" ON "employees"("departmentId");
CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");
CREATE INDEX "cv_records_employeeId_idx" ON "cv_records"("employeeId");

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "manufacturing_orders" ADD CONSTRAINT "manufacturing_orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_ledgers" ADD CONSTRAINT "finance_ledgers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_ledgers" ADD CONSTRAINT "finance_ledgers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_ledgers" ADD CONSTRAINT "finance_ledgers_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "field_visit_schedules" ADD CONSTRAINT "field_visit_schedules_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "office_documents" ADD CONSTRAINT "office_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "spreadsheets" ADD CONSTRAINT "spreadsheets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cv_records" ADD CONSTRAINT "cv_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
