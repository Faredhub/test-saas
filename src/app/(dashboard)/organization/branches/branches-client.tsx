"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Loader2, MapPin, Trash2, Pencil, Upload, Eye, Mail, Calendar, User, Phone } from "lucide-react";
import { createBranch, deleteBranch, updateBranch, getBranchEmployees } from "@/lib/actions/organization";
import { toast } from "sonner";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgChart } from "@/components/layout/org-chart";

type Branch = Awaited<ReturnType<typeof import("@/lib/actions/organization").getBranches>>[number];

type BranchesClientProps = {
  initialData: Branch[];
};

export function BranchesClient({ initialData }: BranchesClientProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [viewingBranch, setViewingBranch] = useState<Branch | null>(null);
  const [isPending, startTransition] = useTransition();

  // Hierarchy view states
  const [activeTab, setActiveTab] = useState<"list" | "hierarchy">("list");
  const [selectedBranchForHierarchy, setSelectedBranchForHierarchy] = useState<string>("");
  const [hierarchyEmployees, setHierarchyEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  const handleBranchChange = async (branchId: string) => {
    setSelectedBranchForHierarchy(branchId);
    setSelectedEmployee(null);
    if (!branchId) {
      setHierarchyEmployees([]);
      return;
    }
    setLoadingEmployees(true);
    try {
      const employees = await getBranchEmployees(branchId);
      setHierarchyEmployees(employees);
    } catch {
      toast.error("Failed to load employees for hierarchy");
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "list" | "hierarchy");
    if (value === "hierarchy" && !selectedBranchForHierarchy && initialData.length > 0) {
      handleBranchChange(initialData[0].id);
    }
  };


  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createBranch({
          name: formData.get("name") as string,
          address: formData.get("address") as string || undefined,
          city: formData.get("city") as string || undefined,
          state: formData.get("state") as string || undefined,
          phone: formData.get("phone") as string || undefined,
          email: formData.get("email") as string || undefined,
          isHeadOffice: formData.get("isHeadOffice") === "on",
        });
        toast.success("Branch created successfully");
        setIsOpen(false);
      } catch {
        toast.error("Failed to create branch");
      }
    });
  }

  async function handleUpdate(formData: FormData) {
    if (!editingBranch) return;
    startTransition(async () => {
      try {
        await updateBranch(editingBranch.id, {
          name: formData.get("name") as string,
          address: formData.get("address") as string || undefined,
          city: formData.get("city") as string || undefined,
          state: formData.get("state") as string || undefined,
          phone: formData.get("phone") as string || undefined,
          email: formData.get("email") as string || undefined,
          isHeadOffice: formData.get("isHeadOffice") === "on",
        });
        toast.success("Branch updated successfully");
        setEditingBranch(null);
      } catch {
        toast.error("Failed to update branch");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteBranch(id);
        toast.success("Branch deleted");
      } catch {
        toast.error("Failed to delete branch");
      }
    });
  }

  const filtered = initialData.filter((branch) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      branch.name.toLowerCase().includes(s) ||
      (branch.city?.toLowerCase().includes(s) ?? false) ||
      (branch.state?.toLowerCase().includes(s) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
          <p className="text-sm text-muted-foreground">Manage office branches and locations</p>
        </div>

        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
            <TabsList>
              <TabsTrigger value="list">Table View</TabsTrigger>
              <TabsTrigger value="hierarchy">Hierarchy View</TabsTrigger>
            </TabsList>
          </Tabs>

          <Link href="/organization/branches/import">
            <Button
              variant="outline"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
          </Link>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
              <Plus className="h-4 w-4" />
              Add Branch
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Branch</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Branch Name *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" name="state" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isHeadOffice" name="isHeadOffice" className="h-4 w-4 rounded border-gray-300" />
                  <Label htmlFor="isHeadOffice">Head Office</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Branch
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          {activeTab === "list" ? (
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search branches..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1 w-full max-w-xs">
                <Label htmlFor="hierarchy-branch-select" className="text-xs text-muted-foreground">Select Branch</Label>
                <select
                  id="hierarchy-branch-select"
                  value={selectedBranchForHierarchy}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Select a branch...</option>
                  {initialData.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {activeTab === "list" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      No branches found. Create your first branch to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>{branch.city ?? "—"}</TableCell>
                      <TableCell>{branch.state ?? "—"}</TableCell>
                      <TableCell>{branch.phone ?? "—"}</TableCell>
                      <TableCell>{branch.email ?? "—"}</TableCell>
                      <TableCell>
                        {branch.isHeadOffice && (
                          <Badge className="bg-amber-100 text-amber-700">Head Office</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingBranch(branch)}
                            disabled={isPending}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingBranch(branch)}
                            disabled={isPending}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(branch.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-8">
              {loadingEmployees ? (
                <div className="flex flex-col items-center justify-center p-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Loading branch hierarchy...</p>
                </div>
              ) : (
                <>
                  <OrgChart
                    employees={hierarchyEmployees}
                    selectedEmployeeId={selectedEmployee?.id}
                    onSelectEmployee={setSelectedEmployee}
                  />

                  {selectedEmployee && (
                    <div className="border border-zinc-200/80 dark:border-zinc-800/85 rounded-2xl p-6 bg-zinc-50/20 dark:bg-zinc-950/10 shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-2xl mx-auto">
                      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                        <div className="h-20 w-20 rounded-full border-2 border-emerald-500 overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shadow-inner relative">
                          {selectedEmployee.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedEmployee.avatar}
                              alt={selectedEmployee.firstName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
                          )}
                        </div>

                        <div className="flex-1 space-y-4 text-center md:text-left w-full">
                          <div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                                {selectedEmployee.firstName} {selectedEmployee.lastName}
                              </h3>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30">
                                {selectedEmployee.status}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground mt-1">
                              {selectedEmployee.designation || "Staff Member"}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-left">
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                              <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80"><Mail className="h-4 w-4 text-muted-foreground" /></span>
                              <span className="truncate">{selectedEmployee.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                              <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80"><Phone className="h-4 w-4 text-muted-foreground" /></span>
                              <span>{selectedEmployee.phone || "No phone added"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                              <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80"><User className="h-4 w-4 text-muted-foreground" /></span>
                              <span>ID: {selectedEmployee.employeeId}</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                              <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80"><Calendar className="h-4 w-4 text-muted-foreground" /></span>
                              <span>Joined: {new Date(selectedEmployee.dateOfJoining).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Branch Dialog */}
      <Dialog open={!!viewingBranch} onOpenChange={(open) => !open && setViewingBranch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Branch Details</DialogTitle>
          </DialogHeader>
          {viewingBranch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Branch Name</Label>
                  <p className="font-medium">{viewingBranch.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">
                    {viewingBranch.isHeadOffice ? "Head Office" : "Branch"}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium">{viewingBranch.address || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">City</Label>
                  <p className="font-medium">{viewingBranch.city || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">State</Label>
                  <p className="font-medium">{viewingBranch.state || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{viewingBranch.phone || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{viewingBranch.email || "—"}</p>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={() => setViewingBranch(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={!!editingBranch} onOpenChange={(open) => !open && setEditingBranch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
          </DialogHeader>
          {editingBranch && (
            <form action={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Branch Name *</Label>
                <Input id="edit-name" name="name" defaultValue={editingBranch.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input id="edit-address" name="address" defaultValue={editingBranch.address ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input id="edit-city" name="city" defaultValue={editingBranch.city ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-state">State</Label>
                  <Input id="edit-state" name="state" defaultValue={editingBranch.state ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input id="edit-phone" name="phone" defaultValue={editingBranch.phone ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" name="email" type="email" defaultValue={editingBranch.email ?? ""} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isHeadOffice"
                  name="isHeadOffice"
                  defaultChecked={editingBranch.isHeadOffice}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="edit-isHeadOffice">Head Office</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingBranch(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
