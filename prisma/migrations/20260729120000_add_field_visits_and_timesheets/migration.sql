-- AlterEnum
ALTER TYPE "TimesheetStatus" ADD VALUE 'PENDING_SENIOR';
ALTER TYPE "TimesheetStatus" ADD VALUE 'PENDING_MANAGER';

-- AlterTable
ALTER TABLE "timesheets" ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "managerApprovedAt" TIMESTAMP(3),
ADD COLUMN     "managerApprovedById" TEXT,
ADD COLUMN     "seniorApprovedAt" TIMESTAMP(3),
ADD COLUMN     "seniorApprovedById" TEXT,
ADD COLUMN     "startTime" TEXT;

-- CreateTable
CREATE TABLE "field_visit_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentScheduleId" TEXT,
    "title" TEXT NOT NULL,
    "siteLocation" TEXT NOT NULL,
    "clientName" TEXT,
    "projectId" TEXT,
    "employeeId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "formTemplateId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_visit_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_visit_schedules_tenantId_idx" ON "field_visit_schedules"("tenantId");

-- CreateIndex
CREATE INDEX "field_visit_schedules_tenantId_employeeId_idx" ON "field_visit_schedules"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "field_visit_schedules_tenantId_date_idx" ON "field_visit_schedules"("tenantId", "date");

-- AddForeignKey
ALTER TABLE "field_visit_schedules" ADD CONSTRAINT "field_visit_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_visit_schedules" ADD CONSTRAINT "field_visit_schedules_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_visit_schedules" ADD CONSTRAINT "field_visit_schedules_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_visit_schedules" ADD CONSTRAINT "field_visit_schedules_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_visit_schedules" ADD CONSTRAINT "field_visit_schedules_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "form_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
