-- FinanceLedger was added to schema.prisma without a matching migration, so
-- fresh databases were missing the table. Any page that touches
-- prisma.financeLedger.* throws TableDoesNotExist, which surfaces in the UI
-- as a generic "Server Components render" failure.

CREATE TABLE IF NOT EXISTS "finance_ledgers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "costType" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "deduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "email" TEXT,
    "contact" TEXT,
    "fileName" TEXT,
    "fileDataUrl" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "finance_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "finance_ledgers_tenantId_slNo_key" ON "finance_ledgers"("tenantId", "slNo");
CREATE INDEX IF NOT EXISTS "finance_ledgers_tenantId_idx" ON "finance_ledgers"("tenantId");

DO $fl$ BEGIN
  ALTER TABLE "finance_ledgers"
    ADD CONSTRAINT "finance_ledgers_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $fl$;
