-- Idempotent: create missing enum types and migrate TEXT columns to enum types.
-- Origin: schema.prisma added these enums after the initial migrations were written.
-- The old srv.ddmn.in DB picked them up via 'prisma db push'; new deploys need this migration.

-- ReviewType: performance_reviews.type
DO $mig$ BEGIN
  CREATE TYPE "ReviewType" AS ENUM ('ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'PROBATION', 'PROJECT_BASED');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'performance_reviews' AND column_name = 'type') = 'text' THEN
    ALTER TABLE "performance_reviews" ALTER COLUMN "type" DROP DEFAULT;
    ALTER TABLE "performance_reviews" ALTER COLUMN "type" TYPE "ReviewType" USING "type"::"ReviewType";
    ALTER TABLE "performance_reviews" ALTER COLUMN "type" SET DEFAULT 'ANNUAL'::"ReviewType";
  END IF;
END $mig$;


-- ReviewStatus: performance_reviews.status
DO $mig$ BEGIN
  CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SELF_REVIEW', 'MANAGER_REVIEW', 'COMPLETED', 'ACKNOWLEDGED');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'performance_reviews' AND column_name = 'status') = 'text' THEN
    ALTER TABLE "performance_reviews" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "performance_reviews" ALTER COLUMN "status" TYPE "ReviewStatus" USING "status"::"ReviewStatus";
    ALTER TABLE "performance_reviews" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"ReviewStatus";
  END IF;
END $mig$;


-- GoalCategory: goals.category
DO $mig$ BEGIN
  CREATE TYPE "GoalCategory" AS ENUM ('PERFORMANCE', 'DEVELOPMENT', 'TEAM', 'COMPANY');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'category') = 'text' THEN
    ALTER TABLE "goals" ALTER COLUMN "category" DROP DEFAULT;
    ALTER TABLE "goals" ALTER COLUMN "category" TYPE "GoalCategory" USING "category"::"GoalCategory";
    ALTER TABLE "goals" ALTER COLUMN "category" SET DEFAULT 'PERFORMANCE'::"GoalCategory";
  END IF;
END $mig$;


-- GoalStatus: goals.status
DO $mig$ BEGIN
  CREATE TYPE "GoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'status') = 'text' THEN
    ALTER TABLE "goals" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "goals" ALTER COLUMN "status" TYPE "GoalStatus" USING "status"::"GoalStatus";
    ALTER TABLE "goals" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED'::"GoalStatus";
  END IF;
END $mig$;


-- GoalPriority: goals.priority
DO $mig$ BEGIN
  CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'priority') = 'text' THEN
    ALTER TABLE "goals" ALTER COLUMN "priority" DROP DEFAULT;
    ALTER TABLE "goals" ALTER COLUMN "priority" TYPE "GoalPriority" USING "priority"::"GoalPriority";
    ALTER TABLE "goals" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM'::"GoalPriority";
  END IF;
END $mig$;


-- CreditNoteType: credit_notes.type
DO $mig$ BEGIN
  CREATE TYPE "CreditNoteType" AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'credit_notes' AND column_name = 'type') = 'text' THEN
    ALTER TABLE "credit_notes" ALTER COLUMN "type" DROP DEFAULT;
    ALTER TABLE "credit_notes" ALTER COLUMN "type" TYPE "CreditNoteType" USING "type"::"CreditNoteType";
    ALTER TABLE "credit_notes" ALTER COLUMN "type" SET DEFAULT 'CREDIT'::"CreditNoteType";
  END IF;
END $mig$;


-- CreditNoteStatus: credit_notes.status
DO $mig$ BEGIN
  CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'APPLIED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'credit_notes' AND column_name = 'status') = 'text' THEN
    ALTER TABLE "credit_notes" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "credit_notes" ALTER COLUMN "status" TYPE "CreditNoteStatus" USING "status"::"CreditNoteStatus";
    ALTER TABLE "credit_notes" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"CreditNoteStatus";
  END IF;
END $mig$;


-- ScheduleStatus: schedule_entries.status
DO $mig$ BEGIN
  CREATE TYPE "ScheduleStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'SWAPPED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'schedule_entries' AND column_name = 'status') = 'text' THEN
    ALTER TABLE "schedule_entries" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "schedule_entries" ALTER COLUMN "status" TYPE "ScheduleStatus" USING "status"::"ScheduleStatus";
    ALTER TABLE "schedule_entries" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'::"ScheduleStatus";
  END IF;
END $mig$;


-- PostStatus: blog_posts.status
DO $mig$ BEGIN
  CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'status') = 'text' THEN
    ALTER TABLE "blog_posts" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "blog_posts" ALTER COLUMN "status" TYPE "PostStatus" USING "status"::"PostStatus";
    ALTER TABLE "blog_posts" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"PostStatus";
  END IF;
END $mig$;


-- ConvoStatus: chat_conversations.status
DO $mig$ BEGIN
  CREATE TYPE "ConvoStatus" AS ENUM ('OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chat_conversations' AND column_name = 'status') = 'text' THEN
    ALTER TABLE "chat_conversations" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "chat_conversations" ALTER COLUMN "status" TYPE "ConvoStatus" USING "status"::"ConvoStatus";
    ALTER TABLE "chat_conversations" ALTER COLUMN "status" SET DEFAULT 'OPEN'::"ConvoStatus";
  END IF;
END $mig$;


-- ReportType: report_templates.type
DO $mig$ BEGIN
  CREATE TYPE "ReportType" AS ENUM ('SURVEY', 'GEOTECHNICAL', 'DESIGN', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'report_templates' AND column_name = 'type') = 'text' THEN
    ALTER TABLE "report_templates" ALTER COLUMN "type" DROP DEFAULT;
    ALTER TABLE "report_templates" ALTER COLUMN "type" TYPE "ReportType" USING "type"::"ReportType";
    ALTER TABLE "report_templates" ALTER COLUMN "type" SET DEFAULT 'CUSTOM'::"ReportType";
  END IF;
END $mig$;


-- ReportGenStatus: generated_reports.status
DO $mig$ BEGIN
  CREATE TYPE "ReportGenStatus" AS ENUM ('DRAFT', 'FINAL', 'APPROVED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'generated_reports' AND column_name = 'status') = 'text' THEN
    ALTER TABLE "generated_reports" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "generated_reports" ALTER COLUMN "status" TYPE "ReportGenStatus" USING "status"::"ReportGenStatus";
    ALTER TABLE "generated_reports" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"ReportGenStatus";
  END IF;
END $mig$;


-- DocFormat: office_documents.format
DO $mig$ BEGIN
  CREATE TYPE "DocFormat" AS ENUM ('RICH_TEXT', 'MARKDOWN', 'HTML');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'office_documents' AND column_name = 'format') = 'text' THEN
    ALTER TABLE "office_documents" ALTER COLUMN "format" DROP DEFAULT;
    ALTER TABLE "office_documents" ALTER COLUMN "format" TYPE "DocFormat" USING "format"::"DocFormat";
    ALTER TABLE "office_documents" ALTER COLUMN "format" SET DEFAULT 'RICH_TEXT'::"DocFormat";
  END IF;
END $mig$;


-- EmailFolder: email_messages.folder
DO $mig$ BEGIN
  CREATE TYPE "EmailFolder" AS ENUM ('INBOX', 'SENT', 'DRAFTS', 'TRASH', 'ARCHIVE', 'SPAM');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'email_messages' AND column_name = 'folder') = 'text' THEN
    ALTER TABLE "email_messages" ALTER COLUMN "folder" DROP DEFAULT;
    ALTER TABLE "email_messages" ALTER COLUMN "folder" TYPE "EmailFolder" USING "folder"::"EmailFolder";
    ALTER TABLE "email_messages" ALTER COLUMN "folder" SET DEFAULT 'INBOX'::"EmailFolder";
  END IF;
END $mig$;


-- ChannelType: chat_channels.type
DO $mig$ BEGIN
  CREATE TYPE "ChannelType" AS ENUM ('GROUP', 'DIRECT', 'ANNOUNCEMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chat_channels' AND column_name = 'type') = 'text' THEN
    ALTER TABLE "chat_channels" ALTER COLUMN "type" DROP DEFAULT;
    ALTER TABLE "chat_channels" ALTER COLUMN "type" TYPE "ChannelType" USING "type"::"ChannelType";
    ALTER TABLE "chat_channels" ALTER COLUMN "type" SET DEFAULT 'GROUP'::"ChannelType";
  END IF;
END $mig$;


-- MsgType: chat_messages.type
DO $mig$ BEGIN
  CREATE TYPE "MsgType" AS ENUM ('TEXT', 'FILE', 'IMAGE', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;

DO $mig$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'type') = 'text' THEN
    ALTER TABLE "chat_messages" ALTER COLUMN "type" DROP DEFAULT;
    ALTER TABLE "chat_messages" ALTER COLUMN "type" TYPE "MsgType" USING "type"::"MsgType";
    ALTER TABLE "chat_messages" ALTER COLUMN "type" SET DEFAULT 'TEXT'::"MsgType";
  END IF;
END $mig$;
