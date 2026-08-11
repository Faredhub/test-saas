-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "salesTeamId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "salesTeamId" TEXT;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "salesTeamId" TEXT;

-- AlterTable
ALTER TABLE "sales_teams" ADD COLUMN     "emailAlias" TEXT;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_salesTeamId_fkey" FOREIGN KEY ("salesTeamId") REFERENCES "sales_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_salesTeamId_fkey" FOREIGN KEY ("salesTeamId") REFERENCES "sales_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_salesTeamId_fkey" FOREIGN KEY ("salesTeamId") REFERENCES "sales_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
