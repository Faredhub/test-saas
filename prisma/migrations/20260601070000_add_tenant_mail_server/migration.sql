-- Per-tenant mail server config used by the email integration phases.
-- One row per tenant maximum; individual user mailbox credentials live on
-- the existing email_accounts table.

CREATE TABLE "tenant_mail_servers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapSecure" BOOLEAN NOT NULL DEFAULT true,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "fromDomain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_mail_servers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_mail_servers_tenantId_key" ON "tenant_mail_servers"("tenantId");

ALTER TABLE "tenant_mail_servers"
  ADD CONSTRAINT "tenant_mail_servers_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
