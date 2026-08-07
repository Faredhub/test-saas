"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  setRolePermissions,
  assignRoleToUser,
  removeRoleFromUser,
  getUserPermissions,
  setUserPermissionsForUser,
  resetUserPermissions,
  assignRoleToDesignation,
  removeRoleFromDesignation,
  getDesignationRoles,
} from "@/lib/actions/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
  Loader2,
  ShieldAlert,
  MoreVertical,
  RotateCcw,
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
  hasCustomPermissions?: boolean;
  roleAssignments: { role: { id: string; name: string } }[];
  employee?: {
    id: string;
    designation: string | null;
    designationId: string | null;
    departmentId: string | null;
  } | null;
};

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  dashboard: "Overview / Dashboard",
  finance: "Finance",
  sales: "Sales",
  inventory: "Site Store (Inventory)",
  hrm: "Human Resource (HRM)",
  projects: "Projects",
  marketing: "Marketing",
  website: "Website & CMS",
  organization: "Organization",
  office: "Workspace",
  settings: "Settings",
};

const RESOURCE_DISPLAY_NAMES: Record<string, string> = {
  analytics: "Dashboard & Analytics",
  accounts: "Books (Accounts)",
  journal: "Journal",
  expenses: "Expenses",
  payroll: "Payroll",
  bills: "Settle (Bills)",
  "credit-notes": "Credit Notes",
  reports: "Reports",
  documents: "Documents",
  leads: "Leads",
  contacts: "Contacts",
  tenders: "Tenders",
  "cv-bank": "CV Bank",
  deals: "Deals",
  quotations: "Quotations",
  invoices: "Invoice",
  subscriptions: "Subscriptions",
  visits: "Route (Visits)",
  stock: "Stock",
  warehouses: "Warehouses",
  assets: "Maintenance (Assets)",
  manufacturing: "Manufacturing",
  products: "Products",
  quality: "Quality Control",
  employees: "Employees",
  recruitment: "Recruitment",
  leaves: "Leaves",
  attendance: "Attendance",
  performance: "Performance",
  scheduling: "Scheduling",
  fleet: "Fleet",
  projects: "Projects",
  templates: "Templates",
  timesheets: "Timesheets",
  tickets: "Tickets",
  campaigns: "Campaigns",
  social: "Social",
  events: "Events",
  surveys: "Surveys",
  pages: "Pages",
  blog: "Blog",
  forum: "Forum",
  faq: "FAQ",
  chat: "Live Chat",
  departments: "Departments",
  branches: "Branches",
  contracts: "Contracts",
  signatures: "Signatures",
  library: "Library",
  notices: "Notices / Announcements",
  calendar: "Calendar",
  notes: "Notes",
  approvals: "Approvals (Workflows)",
  forms: "Forms",
  database: "Health (Database)",
  spreadsheets: "Spreadsheets",
  presentations: "Presentations",
  email: "Email",
  messaging: "Discuss (Messaging)",
  calls: "Calls",
  users: "Users",
  roles: "Roles",
  tenant: "Tenant / Business Portal",
};

export function RolesClient({
  initialRoles,
  allPermissions,
  users,
  initialDesignations,
}: {
  initialRoles: Role[];
  allPermissions: Permission[];
  users: UserWithRoles[];
  initialDesignations: any[];
}) {
  const router = useRouter();
  const roles = initialRoles;
  const [isPending, startTransition] = useTransition();

  // Create role dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Edit role dialog
  const [showEdit, setShowEdit] = useState(false);
  const [editRoleObj, setEditRoleObj] = useState<Role | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Permission dialog
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [selectedPermUserId, setSelectedPermUserId] = useState<string | null>(null);

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
    if (!confirm("Are you sure you want to delete this role? This action cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteRole(id);
        toast.success("Role deleted successfully");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete role");
      }
    });
  }

  function handleOpenEdit(role: Role) {
    setEditRoleObj(role);
    setEditName(role.name);
    setEditDesc(role.description || "");
    setShowEdit(true);
  }

  function handleEditRole() {
    if (!editRoleObj) return;
    startTransition(async () => {
      try {
        await updateRole(editRoleObj.id, {
          name: editName,
          description: editDesc || undefined,
        });
        toast.success("Role updated successfully");
        setShowEdit(false);
        setEditRoleObj(null);
        setEditName("");
        setEditDesc("");
      } catch (err: any) {
        toast.error(err.message || "Failed to update role");
      }
    });
  }

  function openPermissions(role: Role) {
    startTransition(async () => {
      const perms = await getRolePermissions(role.id);
      setSelectedPerms(new Set(perms.map((p) => p.id)));
      setSelectedPermUserId(null);
      setModalDesignationId("");
      setPermRole(role);
    });
  }

  function handleSelectUserForPermissions(userId: string | null) {
    setSelectedPermUserId(userId);
    startTransition(async () => {
      if (userId) {
        try {
          const perms = await getUserPermissions(userId);
          setSelectedPerms(new Set(perms.map((p) => p.id)));
        } catch {
          toast.error("Failed to load user permissions");
        }
      } else if (permRole) {
        try {
          const perms = await getRolePermissions(permRole.id);
          setSelectedPerms(new Set(perms.map((p) => p.id)));
        } catch {
          toast.error("Failed to load role permissions");
        }
      }
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
      try {
        if (selectedPermUserId) {
          const targetUser = users.find((u) => u.id === selectedPermUserId);
          await setUserPermissionsForUser(selectedPermUserId, Array.from(selectedPerms));
          toast.success(`Custom permissions saved for ${targetUser?.name || targetUser?.email || "user"}!`);
        } else {
          await setRolePermissions(permRole.id, Array.from(selectedPerms));
          toast.success(`Role permissions updated for ${permRole.name}!`);
        }
        setPermRole(null);
        setSelectedPermUserId(null);
        router.refresh();
      } catch {
        toast.error("Failed to save permissions");
      }
    });
  }

  function handleResetUserPermissions(userId: string) {
    startTransition(async () => {
      try {
        await resetUserPermissions(userId);
        const targetUser = users.find((u) => u.id === userId);
        toast.success(`Reset ${targetUser?.name || "user"} to default role permissions!`);
        if (permRole) {
          const perms = await getRolePermissions(permRole.id);
          setSelectedPerms(new Set(perms.map((p) => p.id)));
        }
        setSelectedPermUserId(null);
        router.refresh();
      } catch {
        toast.error("Failed to reset user permissions");
      }
    });
  }

  function handleAssignRole() {
    if (!assignUserId || !assignRoleId) return;
    startTransition(async () => {
      await assignRoleToUser(assignUserId, assignRoleId);
      setAssignDialog(false);
      setAssignUserId("");
      setAssignRoleId("");
      router.refresh();
    });
  }

  function handleRemoveRole(userId: string, roleId: string) {
    startTransition(async () => {
      await removeRoleFromUser(userId, roleId);
      router.refresh();
    });
  }

  // Designation Role Assignment states and handlers
  const [selectedDesignationId, setSelectedDesignationId] = useState<string>("");
  const [modalDesignationId, setModalDesignationId] = useState<string>("");
  const [designationRoles, setDesignationRoles] = useState<any[]>([]);
  const [assignDesgRoleDialog, setAssignDesgRoleDialog] = useState(false);
  const [assignDesgRoleId, setAssignDesgRoleId] = useState("");

  const loadDesignationRoles = async (desgId: string) => {
    if (!desgId) {
      setDesignationRoles([]);
      return;
    }
    try {
      const res = await getDesignationRoles(desgId);
      setDesignationRoles(res);
    } catch {
      toast.error("Failed to load designation roles");
    }
  };

  const handleAssignRoleToDesignation = async () => {
    if (!selectedDesignationId || !assignDesgRoleId) return;
    startTransition(async () => {
      try {
        await assignRoleToDesignation(selectedDesignationId, assignDesgRoleId);
        toast.success("Role assigned to designation successfully");
        setAssignDesgRoleDialog(false);
        setAssignDesgRoleId("");
        loadDesignationRoles(selectedDesignationId);
        router.refresh();
      } catch {
        toast.error("Failed to assign role");
      }
    });
  };

  const handleRemoveRoleFromDesignation = async (roleId: string) => {
    if (!selectedDesignationId) return;
    startTransition(async () => {
      try {
        await removeRoleFromDesignation(selectedDesignationId, roleId);
        toast.success("Role removed from designation");
        loadDesignationRoles(selectedDesignationId);
        router.refresh();
      } catch {
        toast.error("Failed to remove role");
      }
    });
  };

  const filteredUsers = selectedDesignationId
    ? users.filter((u) => u.employee?.designationId === selectedDesignationId)
    : users;

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
          <TabsTrigger value="roles">Access</TabsTrigger>
          <TabsTrigger value="users">User Assign</TabsTrigger>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted cursor-pointer focus:outline-none"
                        disabled={isPending}
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 bg-popover border rounded-md shadow-md p-1">
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(role)}
                          className="cursor-pointer flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground outline-none"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteRole(role.id)}
                          className="cursor-pointer flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-destructive/10 text-destructive focus:bg-destructive/10 outline-none"
                        >
                          <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <label htmlFor="designation-selector" className="text-sm font-semibold whitespace-nowrap">Filter & Manage by Designation:</label>
              <select
                id="designation-selector"
                value={selectedDesignationId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDesignationId(val);
                  loadDesignationRoles(val);
                }}
                className="flex h-9 w-[260px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none cursor-pointer"
              >
                <option value="">All Employees / Direct Assignment Only</option>
                {initialDesignations.map((desg) => (
                  <option key={desg.id} value={desg.id}>
                    {desg.name} ({desg.department?.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setAssignDialog(true)} className="hover:shadow-md transition-all duration-200">
                <UserPlus className="h-4 w-4 mr-2" /> Assign Direct Role
              </Button>
            </div>
          </div>

          {selectedDesignationId && (
            <Card className="p-4 border-primary/20 bg-primary/5 hover:shadow-md transition-all duration-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Roles for Designation: {initialDesignations.find(d => d.id === selectedDesignationId)?.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Roles assigned here will be inherited by all employees holding this designation.
                  </p>
                </div>
                <Button size="sm" onClick={() => setAssignDesgRoleDialog(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Assign Role to Designation
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {designationRoles.map((dr) => (
                  <Badge
                    key={dr.role.id}
                    variant="default"
                    className="bg-primary text-primary-foreground cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-all duration-150 group"
                    onClick={() => handleRemoveRoleFromDesignation(dr.role.id)}
                  >
                    {dr.role.name}
                    <X className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                  </Badge>
                ))}
                {designationRoles.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No roles assigned to this designation yet.</span>
                )}
              </div>
            </Card>
          )}

          <Card className="hover:shadow-md transition-all duration-200">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/30 transition-colors duration-150">
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Direct Roles</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors duration-150">
                    <TableCell className="font-medium">{user.name || "Unnamed"}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {user.employee?.designation ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
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
                        {user.hasCustomPermissions && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 text-xs font-semibold"
                            title="This user has custom permission overrides enabled"
                          >
                            Custom Overrides
                          </Badge>
                        )}
                        {user.roleAssignments.length === 0 && !user.hasCustomPermissions && (
                          <span className="text-muted-foreground text-sm">No direct roles</span>
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

      {/* EDIT ROLE DIALOG */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Sales Manager"
                className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description"
                className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)} className="hover:shadow-sm transition-all duration-200">
              Cancel
            </Button>
            <Button onClick={handleEditRole} disabled={isPending || !editName.trim()} className="hover:shadow-md transition-all duration-200">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PERMISSIONS DIALOG */}
      <Dialog open={!!permRole} onOpenChange={() => setPermRole(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPermUserId
                ? `Custom Permissions for ${users.find((u) => u.id === selectedPermUserId)?.name || users.find((u) => u.id === selectedPermUserId)?.email}`
                : `Permissions for ${permRole?.name}`}
            </DialogTitle>
            <div className="mt-2 pt-2 border-t flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-muted-foreground whitespace-nowrap">Filter by Designation:</label>
                <Select
                  value={modalDesignationId || "all-designations"}
                  onValueChange={(val) => {
                    setModalDesignationId(val === "all-designations" || !val ? "" : val);
                    handleSelectUserForPermissions(null); // Reset user selection
                  }}
                >
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue placeholder="All Designations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-designations">All Designations</SelectItem>
                    {initialDesignations.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-muted-foreground whitespace-nowrap">Customize for User:</label>
                <Select
                  value={selectedPermUserId || "role-default"}
                  onValueChange={(val) => {
                    if (val === "role-default") {
                      handleSelectUserForPermissions(null);
                    } else {
                      handleSelectUserForPermissions(val);
                    }
                  }}
                >
                  <SelectTrigger className="w-[280px] h-9">
                    <SelectValue placeholder="Edit default role permissions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role-default">Default ({permRole?.name} Role)</SelectItem>
                    {(() => {
                      const eligibleUsers = users.filter((u) => {
                        if (!permRole) return false;
                        
                        // If a designation is selected inside the modal, filter by it
                        if (modalDesignationId && u.employee?.designationId !== modalDesignationId) {
                          return false;
                        }

                        // Directly assigned the role
                        const hasDirect = u.roleAssignments.some((ra) => ra.role.id === permRole.id);
                        
                        // Inherited the role via designation
                        let hasInherited = false;
                        if (u.employee?.designationId) {
                          const desg = initialDesignations.find((d) => d.id === u.employee?.designationId);
                          hasInherited = desg?.roles?.some((dr: any) => dr.role.id === permRole.id) || false;
                        }
                        
                        return hasDirect || hasInherited;
                      });

                      return eligibleUsers.map((u) => {
                        const isDirect = u.roleAssignments.some((ra) => ra.role.id === permRole?.id);
                        const desgName = u.employee?.designation;
                        const customTag = u.hasCustomPermissions ? " [Custom Overrides]" : "";
                        const label = `${u.name || u.email}${customTag}${desgName ? ` (${desgName})` : ""}${!isDirect ? " [Inherited]" : ""}`;
                        return (
                          <SelectItem key={u.id} value={u.id}>
                            {label}
                          </SelectItem>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedPermUserId && (
              <div className="mt-2 flex items-center justify-between gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Editing custom permission overrides for <strong>{users.find(u => u.id === selectedPermUserId)?.name || "User"}</strong>. These settings explicitly override standard role defaults.
                  </span>
                </div>
                {users.find(u => u.id === selectedPermUserId)?.hasCustomPermissions && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetUserPermissions(selectedPermUserId)}
                    disabled={isPending}
                    className="h-7 text-xs border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset to Role Defaults
                  </Button>
                )}
              </div>
            )}
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
                      className={`h-4 w-4 rounded border flex items-center justify-center transition-all duration-150 ${allSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : someSelected
                            ? "bg-primary/30 border-primary"
                            : "border-muted-foreground"
                        }`}
                    >
                      {allSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="font-semibold text-sm">{MODULE_DISPLAY_NAMES[module] || module}</span>
                    <Badge variant="outline" className="ml-auto text-xs hover:bg-primary/10 transition-colors duration-150">
                      {perms.filter((p) => selectedPerms.has(p.id)).length}/{perms.length}
                    </Badge>
                  </div>
                  <div className="divide-y divide-border/60 ml-6 rounded-md border bg-muted/10">
                    {Object.entries(byResource).map(([resource, resPerms]) => {
                      const resourceLabel = RESOURCE_DISPLAY_NAMES[resource] || resource.replace(/[-_]/g, " ");
                      return (
                        <div
                          key={resource}
                          className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_1fr] items-center gap-2 px-3 py-2"
                        >
                          <span className="text-xs font-medium text-foreground/90 truncate" title={resourceLabel}>
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

      {/* ASSIGN ROLE TO DESIGNATION DIALOG */}
      <Dialog open={assignDesgRoleDialog} onOpenChange={setAssignDesgRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to Designation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Designation</label>
              <Input
                value={initialDesignations.find(d => d.id === selectedDesignationId)?.name || ""}
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={assignDesgRoleId} onValueChange={(v) => v && setAssignDesgRoleId(v)}>
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
            <Button variant="outline" onClick={() => setAssignDesgRoleDialog(false)} className="hover:shadow-sm transition-all duration-200">
              Cancel
            </Button>
            <Button
              onClick={handleAssignRoleToDesignation}
              disabled={isPending || !assignDesgRoleId}
              className="hover:shadow-md transition-all duration-200"
            >
              Assign to Designation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}