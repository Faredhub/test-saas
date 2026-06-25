"use client";

import { useState, useTransition } from "react";
import {
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  setRolePermissions,
  assignRoleToUser,
  removeRoleFromUser,
} from "@/lib/actions/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Users,
  Lock,
  Check,
  X,
  UserPlus,
} from "lucide-react";

type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { users: number; permissions: number };
};

type Permission = {
  id: string;
  module: string;
  action: string;
  resource: string;
  description: string | null;
};

type UserWithRoles = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  status: string;
  roleAssignments: { role: { id: string; name: string } }[];
};

export function RolesClient({
  initialRoles,
  allPermissions,
  users,
}: {
  initialRoles: Role[];
  allPermissions: Permission[];
  users: UserWithRoles[];
}) {
  const [roles] = useState(initialRoles);
  const [isPending, startTransition] = useTransition();

  // Create role dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Permission dialog
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  // User assignment dialog
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleId, setAssignRoleId] = useState("");

  const groupedPerms = allPermissions.reduce(
    (acc, p) => {
      const key = p.module;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  function handleCreateRole() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createRole({ name: newName, description: newDesc || undefined });
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
    });
  }

  function handleDeleteRole(id: string) {
    startTransition(async () => {
      await deleteRole(id);
    });
  }

  function openPermissions(role: Role) {
    startTransition(async () => {
      const perms = await getRolePermissions(role.id);
      setSelectedPerms(new Set(perms.map((p) => p.id)));
      setPermRole(role);
    });
  }

  function togglePerm(id: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleModule(module: string) {
    const modulePerms = groupedPerms[module] || [];
    const allSelected = modulePerms.every((p) => selectedPerms.has(p.id));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  }

  function savePermissions() {
    if (!permRole) return;
    startTransition(async () => {
      await setRolePermissions(permRole.id, Array.from(selectedPerms));
      setPermRole(null);
    });
  }

  function handleAssignRole() {
    if (!assignUserId || !assignRoleId) return;
    startTransition(async () => {
      await assignRoleToUser(assignUserId, assignRoleId);
      setAssignDialog(false);
      setAssignUserId("");
      setAssignRoleId("");
    });
  }

  function handleRemoveRole(userId: string, roleId: string) {
    startTransition(async () => {
      await removeRoleFromUser(userId, roleId);
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Role Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage roles, permissions, and user assignments
          </p>
        </div>
      </div>

      <Tabs defaultValue="roles">
        <TabsList className="hover:shadow-sm transition-all duration-200">
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
        </TabsList>

        {/* ROLES TAB */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreate(true)} className="hover:shadow-md transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" /> New Role
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.id} className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {role.isSystem && <Lock className="h-4 w-4 text-muted-foreground" />}
                        {role.name}
                      </CardTitle>
                      {role.description && (
                        <CardDescription>{role.description}</CardDescription>
                      )}
                    </div>
                    {!role.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRole(role.id)}
                        disabled={isPending}
                        className="hover:bg-destructive/10 transition-colors duration-150"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1 hover:text-foreground transition-colors duration-150">
                      <Users className="h-3.5 w-3.5" /> {role._count.users} users
                    </span>
                    <span className="flex items-center gap-1 hover:text-foreground transition-colors duration-150">
                      <Shield className="h-3.5 w-3.5" /> {role._count.permissions} permissions
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full hover:shadow-sm hover:bg-primary/10 transition-all duration-200"
                    onClick={() => openPermissions(role)}
                    disabled={isPending}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Permissions
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAssignDialog(true)} className="hover:shadow-md transition-all duration-200">
              <UserPlus className="h-4 w-4 mr-2" /> Assign Role
            </Button>
          </div>

          <Card className="hover:shadow-md transition-all duration-200">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/30 transition-colors duration-150">
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors duration-150">
                    <TableCell className="font-medium">{user.name || "Unnamed"}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roleAssignments.map((ra) => (
                          <Badge
                            key={ra.role.id}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-all duration-150 group"
                            onClick={() => handleRemoveRole(user.id, ra.role.id)}
                          >
                            {ra.role.name}
                            <X className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                          </Badge>
                        ))}
                        {user.roleAssignments.length === 0 && (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"} className="hover:shadow-sm transition-all duration-150">
                        {user.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE ROLE DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Sales Manager"
                className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optional description"
                className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="hover:shadow-sm transition-all duration-200">
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={isPending || !newName.trim()} className="hover:shadow-md transition-all duration-200">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PERMISSIONS DIALOG */}
      <Dialog open={!!permRole} onOpenChange={() => setPermRole(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissions for {permRole?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {Object.entries(groupedPerms).map(([module, perms]) => {
              const allSelected = perms.every((p) => selectedPerms.has(p.id));
              const someSelected = perms.some((p) => selectedPerms.has(p.id));
              const byResource = perms.reduce<Record<string, Permission[]>>((acc, p) => {
                (acc[p.resource] ||= []).push(p);
                return acc;
              }, {});
              return (
                <div key={module} className="border rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                  <div
                    className="flex items-center gap-2 cursor-pointer mb-2 hover:bg-muted/30 p-2 rounded-md transition-colors duration-150"
                    onClick={() => toggleModule(module)}
                  >
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center transition-all duration-150 ${
                        allSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : someSelected
                            ? "bg-primary/30 border-primary"
                            : "border-muted-foreground"
                      }`}
                    >
                      {allSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="font-medium capitalize">{module}</span>
                    <Badge variant="outline" className="ml-auto text-xs hover:bg-primary/10 transition-colors duration-150">
                      {perms.filter((p) => selectedPerms.has(p.id)).length}/{perms.length}
                    </Badge>
                  </div>
                  <div className="divide-y divide-border/60 ml-6 rounded-md border bg-muted/10">
                    {Object.entries(byResource).map(([resource, resPerms]) => {
                      const resourceLabel = resource.replace(/[-_]/g, " ");
                      return (
                        <div
                          key={resource}
                          className="grid grid-cols-1 md:grid-cols-[minmax(0,180px)_1fr] items-center gap-2 px-3 py-2"
                        >
                          <span className="text-sm font-medium capitalize truncate" title={resourceLabel}>
                            {resourceLabel}
                          </span>
                          <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1.5">
                            {resPerms.map((perm) => (
                              <label
                                key={perm.id}
                                className="flex flex-row items-center gap-1.5 text-xs cursor-pointer rounded px-1.5 py-0.5 hover:bg-muted/60 transition-colors duration-150"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPerms.has(perm.id)}
                                  onChange={() => togglePerm(perm.id)}
                                  className="rounded hover:cursor-pointer"
                                />
                                <span className="capitalize">{perm.action}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermRole(null)} className="hover:shadow-sm transition-all duration-200">
              Cancel
            </Button>
            <Button onClick={savePermissions} disabled={isPending} className="hover:shadow-md transition-all duration-200">
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ASSIGN ROLE DIALOG */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User</label>
              <Select value={assignUserId} onValueChange={(v) => v && setAssignUserId(v)}>
                <SelectTrigger className="hover:shadow-sm transition-all duration-200">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={assignRoleId} onValueChange={(v) => v && setAssignRoleId(v)}>
                <SelectTrigger className="hover:shadow-sm transition-all duration-200">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)} className="hover:shadow-sm transition-all duration-200">
              Cancel
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={isPending || !assignUserId || !assignRoleId}
              className="hover:shadow-md transition-all duration-200"
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}