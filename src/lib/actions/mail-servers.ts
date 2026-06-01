"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// Tenant Mail Server config. The action authorizes against the settings.tenant
// permission tuple — Super Admin always passes (bypass in requirePermission),
// the default Admin role does not have settings.* perms, so this surface is
// restricted to Super Admin as designed.
const REQUIRED = { module: "settings", action: "update", resource: "tenant" } as const;

export type MailServerInput = {
  name: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  fromDomain?: string | null;
  isActive?: boolean;
};

export async function getTenantMailServer() {
  const { tenantId } = await requirePermission(REQUIRED);
  const row = await prisma.tenantMailServer.findUnique({ where: { tenantId } });
  return row;
}

function sanitize(input: MailServerInput) {
  const name = input.name.trim();
  const imapHost = input.imapHost.trim();
  const smtpHost = input.smtpHost.trim();
  const fromDomain = input.fromDomain?.trim() || null;
  const imapPort = Number.isFinite(input.imapPort) ? input.imapPort : 993;
  const smtpPort = Number.isFinite(input.smtpPort) ? input.smtpPort : 587;

  if (!name) throw new Error("Name is required");
  if (!imapHost) throw new Error("IMAP host is required");
  if (!smtpHost) throw new Error("SMTP host is required");
  if (imapPort < 1 || imapPort > 65535) throw new Error("IMAP port out of range");
  if (smtpPort < 1 || smtpPort > 65535) throw new Error("SMTP port out of range");

  return {
    name,
    imapHost,
    imapPort,
    imapSecure: Boolean(input.imapSecure),
    smtpHost,
    smtpPort,
    smtpSecure: Boolean(input.smtpSecure),
    fromDomain,
    isActive: input.isActive ?? true,
  };
}

export async function upsertTenantMailServer(input: MailServerInput) {
  const { userId, tenantId } = await requirePermission(REQUIRED);
  const data = sanitize(input);

  const row = await prisma.tenantMailServer.upsert({
    where: { tenantId },
    update: data,
    create: { tenantId, ...data },
  });

  await logAudit({
    tenantId,
    userId,
    action: "mail_server.upsert",
    entity: "TenantMailServer",
    entityId: row.id,
    metadata: {
      imapHost: row.imapHost,
      smtpHost: row.smtpHost,
      fromDomain: row.fromDomain,
    },
  });

  revalidatePath("/settings/mail");
  return row;
}

export async function deleteTenantMailServer() {
  const { userId, tenantId } = await requirePermission(REQUIRED);
  const existing = await prisma.tenantMailServer.findUnique({ where: { tenantId } });
  if (!existing) return { deleted: false };

  await prisma.tenantMailServer.delete({ where: { tenantId } });
  await logAudit({
    tenantId,
    userId,
    action: "mail_server.delete",
    entity: "TenantMailServer",
    entityId: existing.id,
  });

  revalidatePath("/settings/mail");
  return { deleted: true };
}
