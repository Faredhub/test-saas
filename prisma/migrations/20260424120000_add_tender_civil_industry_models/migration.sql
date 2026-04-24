-- CreateEnum
CREATE TYPE "TenderSource" AS ENUM ('MANUAL', 'GEM', 'CPPP', 'STATE_PORTAL', 'PRIVATE', 'REFERRAL');

-- CreateEnum
CREATE TYPE "TenderStatus" AS ENUM ('IDENTIFIED', 'EVALUATING', 'PRE_QUALIFIED', 'NOT_QUALIFIED', 'BID_PREPARING', 'BID_SUBMITTED', 'WON', 'LOST', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PreQualStatus" AS ENUM ('NOT_CHECKED', 'CHECKING', 'QUALIFIED', 'NOT_QUALIFIED', 'IMPROVEMENT_NEEDED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SUBMITTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "BidResult" AS ENUM ('PENDING', 'WON', 'LOST', 'TIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EMDType" AS ENUM ('EMD', 'SECURITY_DEPOSIT', 'PERFORMANCE_BG', 'RETENTION_MONEY');

-- CreateEnum
CREATE TYPE "EMDStatus" AS ENUM ('ACTIVE', 'RETURNED', 'FORFEITED', 'EXPIRED', 'CLAIMED');

-- CreateTable
CREATE TABLE "tenders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" "TenderSource" NOT NULL DEFAULT 'MANUAL',
    "sourceUrl" TEXT,
    "issuingAuth" TEXT,
    "category" TEXT,
    "estimatedValue" DECIMAL(15,2),
    "emdAmount" DECIMAL(15,2),
    "emdDeadline" TIMESTAMP(3),
    "submissionDeadline" TIMESTAMP(3),
    "openingDate" TIMESTAMP(3),
    "status" "TenderStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "preQualStatus" "PreQualStatus" NOT NULL DEFAULT 'NOT_CHECKED',
    "preQualNotes" TEXT,
    "eligibilityCriteria" JSONB,
    "documents" JSONB DEFAULT '[]',
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "bidNo" TEXT NOT NULL,
    "bidAmount" DECIMAL(15,2) NOT NULL,
    "status" "BidStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "result" "BidResult" NOT NULL DEFAULT 'PENDING',
    "resultNotes" TEXT,
    "winningAmount" DECIMAL(15,2),
    "competitorName" TEXT,
    "lossReason" TEXT,
    "lessonsLearned" TEXT,
    "keywords" JSONB DEFAULT '[]',
    "documents" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenderId" TEXT,
    "projectId" TEXT,
    "sNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "rate" DECIMAL(15,2),
    "amount" DECIMAL(15,2),
    "category" TEXT,
    "remarks" TEXT,
    "sourceDoc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emd_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenderId" TEXT,
    "type" "EMDType" NOT NULL DEFAULT 'EMD',
    "instrumentType" TEXT DEFAULT 'BG',
    "instrumentNo" TEXT,
    "bankName" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "issuedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" "EMDStatus" NOT NULL DEFAULT 'ACTIVE',
    "returnedDate" TIMESTAMP(3),
    "forfeitedDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emd_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "designation" TEXT,
    "department" TEXT,
    "qualifications" TEXT,
    "experience" INTEGER,
    "skills" JSONB DEFAULT '[]',
    "certifications" JSONB DEFAULT '[]',
    "projects" JSONB DEFAULT '[]',
    "cvFileUrl" TEXT,
    "keywords" JSONB DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cv_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_templates" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "subCategory" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "icon" TEXT,
    "departments" JSONB DEFAULT '[]',
    "expenseCategories" JSONB DEFAULT '[]',
    "leaveTypes" JSONB DEFAULT '[]',
    "taxConfig" JSONB DEFAULT '{}',
    "modules" JSONB DEFAULT '[]',
    "terminology" JSONB DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenders_tenantId_referenceNo_key" ON "tenders"("tenantId", "referenceNo");
CREATE INDEX "tenders_tenantId_idx" ON "tenders"("tenantId");
CREATE INDEX "tenders_tenantId_status_idx" ON "tenders"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bids_tenantId_bidNo_key" ON "bids"("tenantId", "bidNo");
CREATE INDEX "bids_tenantId_idx" ON "bids"("tenantId");
CREATE INDEX "bids_tenantId_tenderId_idx" ON "bids"("tenantId", "tenderId");

-- CreateIndex
CREATE INDEX "boq_items_tenantId_idx" ON "boq_items"("tenantId");
CREATE INDEX "boq_items_tenantId_tenderId_idx" ON "boq_items"("tenantId", "tenderId");

-- CreateIndex
CREATE INDEX "emd_records_tenantId_idx" ON "emd_records"("tenantId");
CREATE INDEX "emd_records_tenantId_status_idx" ON "emd_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cv_records_tenantId_idx" ON "cv_records"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "industry_templates_industry_subCategory_key" ON "industry_templates"("industry", "subCategory");

-- AddForeignKey
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bids" ADD CONSTRAINT "bids_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emd_records" ADD CONSTRAINT "emd_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emd_records" ADD CONSTRAINT "emd_records_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_records" ADD CONSTRAINT "cv_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
