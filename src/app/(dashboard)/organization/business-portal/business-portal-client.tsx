"use client";

import type { ComponentType } from "react";
import { useState, useTransition } from "react";
import {
  CreditCard,
  Database,
  FileText,
  FolderKanban,
  HardDrive,
  Loader2,
  Receipt,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inviteUser, updateStorageAllocation } from "@/lib/actions/organization";

type Portal = Awaited<ReturnType<typeof import("@/lib/actions/organization").getBusinessPortal>>;
type OrgUser = Awaited<ReturnType<typeof import("@/lib/actions/organization").getOrgUsers>>[number];
type OrgRole = Awaited<ReturnType<typeof import("@/lib/actions/organization").getOrgRoles>>[number];

function formatBytes(bytes: number) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${Math.max(0, bytes).toLocaleString("en-IN")} B`;
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

export function BusinessPortalClient({
  portal,
  users,
  roles,
}: {
  portal: Portal;
  users: OrgUser[];
  roles: OrgRole[];
}) {
  const [isPending, startTransition] = useTransition();
  const [roleId, setRoleId] = useState<string>("none");
  const storagePercent = portal.storageLimitBytes > 0
    ? Math.min(100, Math.round((portal.storageUsedBytes / portal.storageLimitBytes) * 100))
    : 0;

  function handleStorage(formData: FormData) {
    startTransition(async () => {
      try {
        await updateStorageAllocation({
          documents: Number(formData.get("documents") || 0),
          projectFiles: Number(formData.get("projectFiles") || 0),
          reports: Number(formData.get("reports") || 0),
          media: Number(formData.get("media") || 0),
        });
        toast.success("Storage allocation updated");
      } catch {
        toast.error("Failed to update storage allocation");
      }
    });
  }

  function handleInvite(formData: FormData) {
    startTransition(async () => {
      try {
        await inviteUser({
          name: String(formData.get("name") || ""),
          email: String(formData.get("email") || ""),
          roleId: roleId === "none" ? undefined : roleId,
        });
        toast.success("Employee onboarding invite created");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to invite employee");
      }
    });
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business Portal</h1>
          <p className="text-sm text-muted-foreground">Manage subscription, storage usage, and employee onboarding</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hover:shadow-sm transition-all duration-200">{portal.plan}</Badge>
          <Badge variant={portal.status === "ACTIVE" ? "default" : "secondary"} className="hover:shadow-sm transition-all duration-200">{portal.status}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Seats Used" value={`${portal.activeUsers + portal.pendingUsers}/${portal.maxUsers}`} helper={`${portal.availableSeats} available`} icon={Users} />
        <StatCard label="Storage Used" value={formatBytes(portal.storageUsedBytes)} helper={`${storagePercent}% of ${formatBytes(portal.storageLimitBytes)}`} icon={HardDrive} />
        <StatCard label="Documents" value={portal.usage.documents} helper={`${portal.usage.projects} projects tracked`} icon={FileText} />
        <StatCard label="Invoices" value={portal.usage.invoices} helper="Payment records" icon={Receipt} />
      </div>

      <Tabs defaultValue="payment" className="space-y-4">
        <TabsList className="hover:shadow-sm transition-all duration-200">
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between hover:bg-muted/30 p-2 rounded-md transition-colors duration-150">
                  <span className="text-muted-foreground">Organization</span>
                  <span className="font-medium">{portal.organizationName}</span>
                </div>
                <div className="flex items-center justify-between hover:bg-muted/30 p-2 rounded-md transition-colors duration-150">
                  <span className="text-muted-foreground">Plan</span>
                  <Badge className="hover:shadow-sm transition-all duration-200">{portal.plan}</Badge>
                </div>
                <div className="flex items-center justify-between hover:bg-muted/30 p-2 rounded-md transition-colors duration-150">
                  <span className="text-muted-foreground">Billing cycle</span>
                  <span>{portal.payment.billingCycle}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4" />
                  Payment Gateway
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between hover:bg-muted/30 p-2 rounded-md transition-colors duration-150">
                  <span className="text-muted-foreground">Gateway</span>
                  <span className="font-medium">{portal.payment.gatewayStatus}</span>
                </div>
                <div className="flex items-center justify-between hover:bg-muted/30 p-2 rounded-md transition-colors duration-150">
                  <span className="text-muted-foreground">Next renewal</span>
                  <span>{portal.payment.nextRenewal ?? "Not scheduled"}</span>
                </div>
                <Button type="button" variant="outline" className="w-full hover:shadow-sm hover:bg-primary/10 transition-all duration-200">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Payment Method
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="h-4 w-4" />
                  License Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(100, ((portal.activeUsers + portal.pendingUsers) / portal.maxUsers) * 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground hover:bg-muted/30 p-2 rounded-md transition-colors duration-150">
                  {portal.activeUsers} active and {portal.pendingUsers} pending employees out of {portal.maxUsers} seats.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                Manage & Allocate Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{formatBytes(portal.storageUsedBytes)} used</span>
                  <span className="text-muted-foreground">{formatBytes(portal.storageLimitBytes)} limit</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${storagePercent}%` }} />
                </div>
              </div>

              <form action={handleStorage} className="grid gap-4 md:grid-cols-4">
                {[
                  ["documents", "Organization Documents"],
                  ["projectFiles", "Project Files"],
                  ["reports", "Reports"],
                  ["media", "Media"],
                ].map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      name={key}
                      type="number"
                      min={0}
                      defaultValue={portal.storageAllocationMb[key] ?? 0}
                      className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-xs text-muted-foreground">Allocation in MB</p>
                  </div>
                ))}
                <div className="md:col-span-4">
                  <Button type="submit" disabled={isPending} className="hover:shadow-md transition-all duration-200">
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HardDrive className="mr-2 h-4 w-4" />}
                    Save Storage Allocation
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="h-4 w-4" />
                  Add Employee
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="Employee name"
                      className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="employee@company.com"
                      className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={roleId} onValueChange={(value) => setRoleId(value ?? "none")}>
                      <SelectTrigger className="hover:shadow-sm transition-all duration-200">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No role</SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={isPending || portal.availableSeats <= 0} className="hover:shadow-md transition-all duration-200">
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Create Onboarding Invite
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderKanban className="h-4 w-4" />
                  Employee Onboarding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {users.slice(0, 10).map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3 rounded-md border p-3 hover:shadow-sm hover:border-primary/20 transition-all duration-200">
                    <div>
                      <p className="font-medium">{user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant={user.status === "ACTIVE" ? "default" : "outline"} className="hover:shadow-sm transition-all duration-200">
                      {user.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}