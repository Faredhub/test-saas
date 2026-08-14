-- CreateEnum
CREATE TYPE "CivilReportStatus" AS ENUM ('DRAFT', 'FINAL', 'APPROVED', 'ARCHIVED');

-- CreateTable: civil_geotechnical_reports
CREATE TABLE "civil_geotechnical_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "location" TEXT,
    "client" TEXT,
    "date" TEXT NOT NULL DEFAULT '',
    "boreholeData" JSONB NOT NULL DEFAULT '[]',
    "labResults" JSONB NOT NULL DEFAULT '[]',
    "photos" JSONB NOT NULL DEFAULT '[]',
    "reportData" JSONB,
    "status" "CivilReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civil_geotechnical_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable: civil_survey_reports
CREATE TABLE "civil_survey_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "location" TEXT,
    "client" TEXT,
    "date" TEXT NOT NULL DEFAULT '',
    "instrument" TEXT,
    "benchmarkElevation" DECIMAL(12,3),
    "stationData" JSONB NOT NULL DEFAULT '[]',
    "photos" JSONB NOT NULL DEFAULT '[]',
    "reportData" JSONB,
    "status" "CivilReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civil_survey_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable: civil_design_reports
CREATE TABLE "civil_design_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "location" TEXT,
    "client" TEXT,
    "date" TEXT NOT NULL DEFAULT '',
    "designCode" TEXT,
    "parameters" JSONB NOT NULL DEFAULT '[]',
    "photos" JSONB NOT NULL DEFAULT '[]',
    "reportData" JSONB,
    "status" "CivilReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civil_design_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable: analysis_of_rates
CREATE TABLE "analysis_of_rates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "itemNo" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'cum',
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 1,
    "materialCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "labourCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "machineryCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "materialRoyalty" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "overheadPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "profitPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "otherCharges" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_of_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: schedule_of_rates
CREATE TABLE "schedule_of_rates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "aorId" TEXT,
    "itemNo" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "materialName" TEXT,
    "quarryName" TEXT,
    "leadKm" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "leadRatePerKm" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "quarryLat" DECIMAL(9,6),
    "quarryLng" DECIMAL(9,6),
    "materialCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "labourCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "machineryCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "materialRoyalty" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_of_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: civil_estimations
CREATE TABLE "civil_estimations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "subType" TEXT,
    "roadType" TEXT,
    "templateType" TEXT,
    "title" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "location" TEXT,
    "client" TEXT,
    "date" TEXT NOT NULL DEFAULT '',
    "state" TEXT,
    "department" TEXT,
    "contingencyPercent" DECIMAL(6,2) NOT NULL DEFAULT 5,
    "abstract" JSONB NOT NULL DEFAULT '[]',
    "photos" JSONB NOT NULL DEFAULT '[]',
    "reportData" JSONB,
    "status" "CivilReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civil_estimations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: civil_estimation_items
CREATE TABLE "civil_estimation_items" (
    "id" TEXT NOT NULL,
    "estimationId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "aorNo" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "wastage" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "unit" TEXT,
    "rate" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,

    CONSTRAINT "civil_estimation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "civil_geotechnical_reports_tenantId_idx" ON "civil_geotechnical_reports"("tenantId");

-- CreateIndex
CREATE INDEX "civil_geotechnical_reports_tenantId_status_idx" ON "civil_geotechnical_reports"("tenantId", "status");

-- CreateIndex
CREATE INDEX "civil_survey_reports_tenantId_idx" ON "civil_survey_reports"("tenantId");

-- CreateIndex
CREATE INDEX "civil_survey_reports_tenantId_status_idx" ON "civil_survey_reports"("tenantId", "status");

-- CreateIndex
CREATE INDEX "civil_design_reports_tenantId_idx" ON "civil_design_reports"("tenantId");

-- CreateIndex
CREATE INDEX "civil_design_reports_tenantId_status_idx" ON "civil_design_reports"("tenantId", "status");

-- CreateIndex
CREATE INDEX "analysis_of_rates_tenantId_idx" ON "analysis_of_rates"("tenantId");

-- CreateIndex
CREATE INDEX "analysis_of_rates_tenantId_state_idx" ON "analysis_of_rates"("tenantId", "state");

-- CreateIndex
CREATE INDEX "analysis_of_rates_tenantId_department_idx" ON "analysis_of_rates"("tenantId", "department");

-- CreateIndex
CREATE INDEX "analysis_of_rates_tenantId_category_idx" ON "analysis_of_rates"("tenantId", "category");

-- CreateIndex
CREATE INDEX "schedule_of_rates_tenantId_idx" ON "schedule_of_rates"("tenantId");

-- CreateIndex
CREATE INDEX "schedule_of_rates_tenantId_state_department_idx" ON "schedule_of_rates"("tenantId", "state", "department");

-- CreateIndex
CREATE INDEX "schedule_of_rates_tenantId_aorId_idx" ON "schedule_of_rates"("tenantId", "aorId");

-- CreateIndex
CREATE INDEX "civil_estimations_tenantId_idx" ON "civil_estimations"("tenantId");

-- CreateIndex
CREATE INDEX "civil_estimations_tenantId_status_idx" ON "civil_estimations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "civil_estimations_tenantId_projectType_idx" ON "civil_estimations"("tenantId", "projectType");

-- CreateIndex
CREATE INDEX "civil_estimation_items_estimationId_idx" ON "civil_estimation_items"("estimationId");

-- AddForeignKey
ALTER TABLE "civil_geotechnical_reports" ADD CONSTRAINT "civil_geotechnical_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "civil_survey_reports" ADD CONSTRAINT "civil_survey_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "civil_design_reports" ADD CONSTRAINT "civil_design_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analysis_of_rates" ADD CONSTRAINT "analysis_of_rates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedule_of_rates" ADD CONSTRAINT "schedule_of_rates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "civil_estimations" ADD CONSTRAINT "civil_estimations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "civil_estimation_items" ADD CONSTRAINT "civil_estimation_items_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "civil_estimations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
