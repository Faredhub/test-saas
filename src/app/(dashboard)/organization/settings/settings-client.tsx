"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Building,
  FileText,
  CreditCard,
  Users,
  Settings2,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import {
  updateOrgSettings,
  updateUserStatus,
  inviteUser,
  updateSystemSettings,
  type SystemSettings,
} from "@/lib/actions/organization";
import { toast } from "sonner";

type OrgSettings = Awaited<ReturnType<typeof import("@/lib/actions/organization").getOrgSettings>>;
type OrgUser = Awaited<ReturnType<typeof import("@/lib/actions/organization").getOrgUsers>>[number];
type OrgRole = Awaited<ReturnType<typeof import("@/lib/actions/organization").getOrgRoles>>[number];

type SettingsClientProps = {
  initialData: OrgSettings;
  users: OrgUser[];
  roles: OrgRole[];
};

// =============================================================================
// Company Info Tab (existing functionality, extracted)
// =============================================================================

function CompanyInfoTab({ initialData }: { initialData: NonNullable<OrgSettings> }) {
  const [isPending, startTransition] = useTransition();

  async function handleCompanyInfo(formData: FormData) {
    startTransition(async () => {
      try {
        await updateOrgSettings({
          name: formData.get("name") as string,
          email: formData.get("email") as string || undefined,
          phone: formData.get("phone") as string || undefined,
          website: formData.get("website") as string || undefined,
          address: formData.get("address") as string || undefined,
          city: formData.get("city") as string || undefined,
          state: formData.get("state") as string || undefined,
          pincode: formData.get("pincode") as string || undefined,
        });
        toast.success("Company info updated");
      } catch {
        toast.error("Failed to update company info");
      }
    });
  }

  async function handleTaxInfo(formData: FormData) {
    startTransition(async () => {
      try {
        await updateOrgSettings({
          pan: formData.get("pan") as string || undefined,
          gst: formData.get("gst") as string || undefined,
          cin: formData.get("cin") as string || undefined,
        });
        toast.success("Tax info updated");
      } catch {
        toast.error("Failed to update tax info");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Company Info */}
      <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic details about your organization</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={handleCompanyInfo} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input id="name" name="name" defaultValue={initialData.name} required className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={initialData.email ?? ""} className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={initialData.phone ?? ""} className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" defaultValue={initialData.website ?? ""} className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={initialData.address ?? ""} className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={initialData.city ?? ""} className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" defaultValue={initialData.state ?? ""} className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" name="pincode" defaultValue={initialData.pincode ?? ""} className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending} className="hover:shadow-md transition-all duration-200">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Company Info
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tax & Compliance */}
      <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Tax & Compliance</CardTitle>
              <CardDescription>Tax registration and compliance details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={handleTaxInfo} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input id="pan" name="pan" defaultValue={initialData.pan ?? ""} placeholder="AAAAA0000A" className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst">GST Number</Label>
                <Input id="gst" name="gst" defaultValue={initialData.gst ?? ""} placeholder="22AAAAA0000A1Z5" className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cin">CIN</Label>
                <Input id="cin" name="cin" defaultValue={initialData.cin ?? ""} placeholder="U00000AA0000AAA000000" className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending} className="hover:shadow-md transition-all duration-200">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Tax Info
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Your current plan and usage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="hover:bg-muted/30 p-3 rounded-md transition-colors duration-150">
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-lg font-semibold capitalize">{initialData.plan?.toLowerCase() ?? "Free"}</p>
            </div>
            <div className="hover:bg-muted/30 p-3 rounded-md transition-colors duration-150">
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <p className="text-lg font-semibold">
                {Math.round(Number(initialData.storageUsedBytes ?? 0) / 1048576)} MB
              </p>
              <div className="mt-2 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      (Number(initialData.storageUsedBytes ?? 0) / Number(initialData.storageLimitBytes ?? 1073741824)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(Number(initialData.storageUsedBytes ?? 0) / 1048576)} /{" "}
                {Math.round(Number(initialData.storageLimitBytes ?? 1073741824) / 1048576)} MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Users & Licences Tab (ORG-A003)
// =============================================================================

function UsersLicencesTab({
  users,
  roles,
  maxUsers,
}: {
  users: OrgUser[];
  roles: OrgRole[];
  maxUsers: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState<OrgUser | null>(null);

  const activeCount = users.filter((u) => u.status !== "INACTIVE").length;

  function handleToggleStatus(user: OrgUser) {
    if (user.status === "ACTIVE") {
      // Show confirmation before deactivating
      setConfirmUser(user);
    } else {
      // Activate directly
      startTransition(async () => {
        try {
          await updateUserStatus(user.id, true);
          toast.success(`${user.name || user.email} activated`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to update user");
        }
      });
    }
  }

  function confirmDeactivate() {
    if (!confirmUser) return;
    const user = confirmUser;
    setConfirmUser(null);
    startTransition(async () => {
      try {
        await updateUserStatus(user.id, false);
        toast.success(`${user.name || user.email} deactivated`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update user");
      }
    });
  }

  async function handleInvite(formData: FormData) {
    startTransition(async () => {
      try {
        await inviteUser({
          email: formData.get("invite-email") as string,
          name: formData.get("invite-name") as string,
          roleId: (formData.get("invite-role") as string) || undefined,
        });
        toast.success("User invited successfully");
        setInviteOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to invite user");
      }
    });
  }

  function displayName(user: OrgUser) {
    if (user.name) return user.name;
    if (user.firstName) return [user.firstName, user.lastName].filter(Boolean).join(" ");
    return user.email;
  }

  function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "INACTIVE":
        return "destructive";
      case "PENDING_VERIFICATION":
        return "outline";
      default:
        return "secondary";
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case "ACTIVE":
        return "Active";
      case "INACTIVE":
        return "Inactive";
      case "PENDING_VERIFICATION":
        return "Pending";
      case "SUSPENDED":
        return "Suspended";
      default:
        return status;
    }
  }

  return (
    <div className="space-y-6">
      {/* Seat count */}
      <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>User Licences</CardTitle>
                <CardDescription>Manage user access and seat allocation</CardDescription>
              </div>
            </div>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger render={<Button size="sm" className="hover:shadow-md transition-all duration-200" />}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite a New User</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your organization. They will set their password via the reset flow.
                  </DialogDescription>
                </DialogHeader>
                <form action={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Full Name *</Label>
                    <Input id="invite-name" name="invite-name" required placeholder="John Doe" className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email *</Label>
                    <Input id="invite-email" name="invite-email" type="email" required placeholder="john@example.com" className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role (optional)</Label>
                    <Select name="invite-role">
                      <SelectTrigger className="w-full hover:shadow-sm transition-all duration-200">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isPending} className="hover:shadow-md transition-all duration-200">
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send Invitation
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Seat usage bar */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-medium">
                {activeCount} of {maxUsers} seats used
              </p>
              <p className="text-xs text-muted-foreground">
                {maxUsers - activeCount} seat{maxUsers - activeCount !== 1 ? "s" : ""} available
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min((activeCount / maxUsers) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Users table */}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/30 transition-colors duration-150">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors duration-150">
                    <TableCell className="font-medium">{displayName(user)}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.roleAssignments.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {user.roleAssignments.map((ra) => (
                            <Badge key={ra.role.id} variant="secondary" className="hover:shadow-sm transition-all duration-150">
                              <ShieldCheck className="mr-1 h-3 w-3" />
                              {ra.role.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No role</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(user.status)} className="hover:shadow-sm transition-all duration-150">
                        {statusLabel(user.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={user.status === "ACTIVE"}
                        onCheckedChange={() => handleToggleStatus(user)}
                        disabled={isPending || user.status === "PENDING_VERIFICATION"}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Deactivation confirmation dialog */}
      <Dialog open={!!confirmUser} onOpenChange={(open) => !open && setConfirmUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>{confirmUser?.name || confirmUser?.email}</strong>? They will lose access
              to the system immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUser(null)} className="hover:shadow-sm transition-all duration-200">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeactivate} disabled={isPending} className="hover:shadow-md transition-all duration-200">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// System Settings Tab (ORG-A005)
// =============================================================================

const CURRENCIES = [
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const FEATURE_TOGGLES = [
  { key: "multiCurrency" as const, label: "Multi-Currency Support", description: "Enable transactions in multiple currencies" },
  { key: "inventoryTracking" as const, label: "Inventory Tracking", description: "Track stock levels and inventory movement" },
  { key: "approvalWorkflows" as const, label: "Approval Workflows", description: "Require approvals for quotes, invoices, and expenses" },
  { key: "advancedReporting" as const, label: "Advanced Reporting", description: "Enable custom report builder and analytics" },
];

function SystemSettingsTab({ settings }: { settings: SystemSettings }) {
  const [isPending, startTransition] = useTransition();
  const [currency, setCurrency] = useState(settings.currency ?? "INR");
  const [dateFormat, setDateFormat] = useState(settings.dateFormat ?? "DD/MM/YYYY");
  const [fiscalMonth, setFiscalMonth] = useState(settings.fiscalYearStartMonth ?? 3); // April = index 3
  const [features, setFeatures] = useState<NonNullable<SystemSettings["features"]>>({
    multiCurrency: false,
    inventoryTracking: false,
    approvalWorkflows: true,
    advancedReporting: false,
    ...settings.features,
  });

  function toggleFeature(key: keyof NonNullable<SystemSettings["features"]>) {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateSystemSettings({
          currency,
          dateFormat,
          fiscalYearStartMonth: fiscalMonth,
          features,
        });
        toast.success("System settings saved");
      } catch {
        toast.error("Failed to save system settings");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Preferences */}
      <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Configure default currency, date format, and fiscal year</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                <SelectTrigger className="w-full hover:shadow-sm transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select value={dateFormat} onValueChange={(v) => v && setDateFormat(v)}>
                <SelectTrigger className="w-full hover:shadow-sm transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fiscal Year Starts</Label>
              <Select value={String(fiscalMonth)} onValueChange={(v) => v != null && setFiscalMonth(Number(v))}>
                <SelectTrigger className="w-full hover:shadow-sm transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Feature Toggles</CardTitle>
              <CardDescription>Enable or disable optional modules for your organization</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FEATURE_TOGGLES.map((ft) => (
              <div key={ft.key} className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm hover:border-primary/20 transition-all duration-200">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{ft.label}</p>
                  <p className="text-xs text-muted-foreground">{ft.description}</p>
                </div>
                <Switch
                  checked={!!features[ft.key]}
                  onCheckedChange={() => toggleFeature(ft.key)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending} className="hover:shadow-md transition-all duration-200">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save System Settings
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Settings Component
// =============================================================================

export function SettingsClient({ initialData, users, roles }: SettingsClientProps) {
  if (!initialData) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Organization not found.
      </div>
    );
  }

  const systemSettings = (initialData.settings as SystemSettings) ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your company information, users, and system preferences</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="hover:shadow-sm transition-all duration-200">
          <TabsTrigger value="company">
            <Building className="mr-1.5 h-4 w-4" />
            Company Info
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-1.5 h-4 w-4" />
            Users & Licences
          </TabsTrigger>
          <TabsTrigger value="system">
            <Settings2 className="mr-1.5 h-4 w-4" />
            System Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanyInfoTab initialData={initialData} />
        </TabsContent>

        <TabsContent value="users">
          <UsersLicencesTab
            users={users}
            roles={roles}
            maxUsers={initialData.maxUsers}
          />
        </TabsContent>

        <TabsContent value="system">
          <SystemSettingsTab settings={systemSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}