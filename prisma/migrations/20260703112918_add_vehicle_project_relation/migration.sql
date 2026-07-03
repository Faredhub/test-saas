-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "projectId" TEXT;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
