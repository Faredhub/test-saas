-- AlterEnum
BEGIN;
CREATE TYPE "PreQualStatus_new" AS ENUM ('NOT_CHECKED', 'CHECKING', 'QUALIFIED', 'NOT_QUALIFIED_PQ', 'IMPROVEMENT_NEEDED');
ALTER TABLE "public"."tenders" ALTER COLUMN "preQualStatus" DROP DEFAULT;
ALTER TABLE "tenders" ALTER COLUMN "preQualStatus" TYPE "PreQualStatus_new" USING ("preQualStatus"::text::"PreQualStatus_new");
ALTER TYPE "PreQualStatus" RENAME TO "PreQualStatus_old";
ALTER TYPE "PreQualStatus_new" RENAME TO "PreQualStatus";
DROP TYPE "public"."PreQualStatus_old";
ALTER TABLE "tenders" ALTER COLUMN "preQualStatus" SET DEFAULT 'NOT_CHECKED';
COMMIT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "middleName" TEXT;
