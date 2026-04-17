"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

// ============================================================================
// ROLES
// ============================================================================

export async function getRoles() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.role.findMany({
    where: tenantScope(tenantId),
    include: {
      _count: { select: { users: true, permissions: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createRole(data: { name: string; description?: string }) {
  const { userId, tenantId } = await getSessionOrThrow();
  const role = await prisma.role.create({
    data: { tenantId, name: data.name, description: data.description },
  });
  await logAudit({ userId, tenantId, action: "role.create", entity: "Role", entityId: role.id, metadata: { role } });
  revalidatePath("/settings/roles");
  return role;
}

export async function updateRole(id: string, data: { name?: string; description?: string }) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.role.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!existing) throw new Error("Role not found");
  if (existing.isSystem && data.name && data.name !== existing.name) {
    throw new Error("Cannot rename system roles");
  }
  const role = await prisma.role.update({ where: { id }, data });
  await logAudit({ userId, tenantId, action: "role.update", entity: "Role", entityId: id, metadata: { existing, role } });
  revalidatePath("/settings/roles");
  return role;
}

export async function deleteRole(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.role.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!existing) throw new Error("Role not found");
  if (existing.isSystem) throw new Error("Cannot delete system roles");
  await prisma.role.delete({ where: { id } });
  await logAudit({ userId, tenantId, action: "role.delete", entity: "Role", entityId: id, metadata: { existing } });
  revalidatePath("/settings/roles");
}

// ============================================================================
// PERMISSIONS
// ============================================================================

export async function getAllPermissions() {
  return prisma.permission.findMany({ orderBy: [{ module: "asc" }, { resource: "asc" }, { action: "asc" }] });
}

export async function getRolePermissions(roleId: string) {
  const perms = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  return perms.map((rp) => rp.permission);
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
  const { userId, tenantId } = await getSessionOrThrow();
  const role = await prisma.role.findFirst({ where: { id: roleId, ...tenantScope(tenantId) } });
  if (!role) throw new Error("Role not found");

  // Delete existing and re-create
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    });
  }
  await logAudit({ userId, tenantId, action: "role.permissions.update", entity: "Role", entityId: roleId, metadata: { permissionIds } });
  revalidatePath("/settings/roles");
}

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

export async function getUsersWithRoles() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.user.findMany({
    where: tenantScope(tenantId),
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      status: true,
      roleAssignments: {
        include: { role: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function assignRoleToUser(userId: string, roleId: string) {
  const { userId: currentUserId, tenantId } = await getSessionOrThrow();
  // Verify role and user belong to tenant
  const role = await prisma.role.findFirst({ where: { id: roleId, ...tenantScope(tenantId) } });
  if (!role) throw new Error("Role not found");
  const user = await prisma.user.findFirst({ where: { id: userId, ...tenantScope(tenantId) } });
  if (!user) throw new Error("User not found");

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  });
  await logAudit({ userId: currentUserId, tenantId, action: "user.role.assign", entity: "User", entityId: userId, metadata: { roleId, roleName: role.name } });
  revalidatePath("/settings/roles");
}

export async function removeRoleFromUser(userId: string, roleId: string) {
  const { userId: currentUserId, tenantId } = await getSessionOrThrow();
  await prisma.userRole.delete({
    where: { userId_roleId: { userId, roleId } },
  });
  await logAudit({ userId: currentUserId, tenantId, action: "user.role.remove", entity: "User", entityId: userId, metadata: { roleId } });
  revalidatePath("/settings/roles");
}
