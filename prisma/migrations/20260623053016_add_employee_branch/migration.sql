-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "branchId" TEXT;

-- CreateIndex
CREATE INDEX "employees_tenantId_branchId_idx" ON "employees"("tenantId", "branchId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
