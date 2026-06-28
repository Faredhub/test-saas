-- Add projectName column to office module tables.
-- These columns exist in the Prisma schema (commit 764fc93) but no migration
-- shipped, so deployed databases were missing them and threw P2022 ColumnNotFound.
-- IF NOT EXISTS keeps this idempotent across DBs with partial drift.

-- AlterTable
ALTER TABLE "office_documents" ADD COLUMN IF NOT EXISTS "projectName" TEXT;

-- AlterTable
ALTER TABLE "spreadsheets" ADD COLUMN IF NOT EXISTS "projectName" TEXT;

-- AlterTable
ALTER TABLE "presentations" ADD COLUMN IF NOT EXISTS "projectName" TEXT;
