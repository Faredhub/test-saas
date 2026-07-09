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
import { Plus, Search, Loader2, MapPin, Trash2, Pencil, Upload, Eye, Mail, Calendar, User, Phone, MessageSquare, Video, PhoneCall, X } from "lucide-react";
import { createBranch, deleteBranch, updateBranch, getBranchEmployees, assignEmployeeToBranch } from "@/lib/actions/organization";
import { toast } from "sonner";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrgChart } from "@/components/layout/org-chart";
import { BranchHierarchyTree } from "@/components/layout/org-hierarchy-tree";
import { useRouter } from "next/navigation";

type Branch = Awaited<ReturnType<typeof import("@/lib/actions/organization").getBranches>>[number];

type BranchesClientProps = {
  initialData: Branch[];
  allEmployees: Array<{
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
    designation: string | null;
    userId: string | null;
    departmentId: string | null;
    branchId: string | null;
  }>;
};

export function BranchesClient({ initialData, allEmployees }: BranchesClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [viewingBranch, setViewingBranch] = useState<Branch | null>(null);
  const [isPending, startTransition] = useTransition();

  // Branch employees management states
  const [selectedBranchEmployees, setSelectedBranchEmployees] = useState<any[]>([]);
  const [loadingBranchEmployees, setLoadingBranchEmployees] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState("");

  const loadBranchEmployees = async (branchId: string) => {
    setLoadingBranchEmployees(true);
    try {
      const res = await getBranchEmployees(branchId);
      setSelectedBranchEmployees(res);
    } catch {
      toast.error("Failed to load branch employees");
    } finally {
      setLoadingBranchEmployees(false);
    }
  };

  const handleAssignEmployee = async () => {
    if (!viewingBranch || !assignEmployeeId) return;
    startTransition(async () => {
      try {
        await assignEmployeeToBranch(assignEmployeeId, viewingBranch.id);
        toast.success("Employee assigned successfully");
        setAssignEmployeeId("");
        loadBranchEmployees(viewingBranch.id);
      } catch {
        toast.error("Failed to assign employee");
      }
    });
  };

  const handleRemoveEmployee = async (empId: string) => {
    if (!viewingBranch) return;
    startTransition(async () => {
      try {
        await assignEmployeeToBranch(empId, null);
        toast.success("Employee removed from branch");
        loadBranchEmployees(viewingBranch.id);
      } catch {
        toast.error("Failed to remove employee");
      }
    });
  };

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
        const employeeId = formData.get("employeeId") as string;
        const branch = await createBranch({
          name: formData.get("name") as string,
          address: formData.get("address") as string || undefined,
          city: formData.get("city") as string || undefined,
          state: formData.get("state") as string || undefined,
          phone: formData.get("phone") as string || undefined,
          email: formData.get("email") as string || undefined,
          isHeadOffice: formData.get("isHeadOffice") === "on",
          branchHeadId: formData.get("branchHeadId") as string || undefined,
        });

        if (employeeId) {
          await assignEmployeeToBranch(employeeId, branch.id);
        }

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
        const employeeId = formData.get("employeeId") as string;
        await updateBranch(editingBranch.id, {
          name: formData.get("name") as string,
          address: formData.get("address") as string || undefined,
          city: formData.get("city") as string || undefined,
          state: formData.get("state") as string || undefined,
          phone: formData.get("phone") as string || undefined,
          email: formData.get("email") as string || undefined,
          isHeadOffice: formData.get("isHeadOffice") === "on",
          branchHeadId: formData.get("branchHeadId") as string || null,
        });

        if (employeeId) {
          await assignEmployeeToBranch(employeeId, editingBranch.id);
        }

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
    if (employeeFilter) {
      const emp = allEmployees.find((e) => e.id === employeeFilter);
      if (emp?.branchId !== branch.id) return false;
    }

    if (!search) return true;
    const s = search.toLowerCase();
    const branchEmployees = allEmployees.filter((emp) => emp.branchId === branch.id);
    const hasMatchingEmployee = branchEmployees.some(
      (emp) =>
        emp.firstName.toLowerCase().includes(s) ||
        (emp.lastName?.toLowerCase().includes(s) ?? false)
    );

    return (
      branch.name.toLowerCase().includes(s) ||
      (branch.city?.toLowerCase().includes(s) ?? false) ||
      (branch.state?.toLowerCase().includes(s) ?? false) ||
      hasMatchingEmployee
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
                <div className="space-y-2">
                  <Label htmlFor="branchHeadId">Branch Head</Label>
                  <select
                    name="branchHeadId"
                    id="branchHeadId"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none"
                  >
                    <option value="">Select Branch Head...</option>
                    {allEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} {emp.designation ? `(${emp.designation})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Assign Employee</Label>
                  <select
                    name="employeeId"
                    id="employeeId"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none cursor-pointer"
                  >
                    <option value="">Select Employee to Assign...</option>
                    {allEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName ?? ""} {emp.designation ? `(${emp.designation})` : ""}
                      </option>
                    ))}
                  </select>
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
            <div className="flex items-center gap-4 flex-wrap w-full">
              <div className="relative flex-1 min-w-[240px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search branches..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="employee-filter" className="text-xs text-muted-foreground shrink-0">Filter by Employee:</Label>
                <select
                  id="employee-filter"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="flex h-9 w-[220px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none cursor-pointer"
                >
                  <option value="">All Employees</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName ?? ""}
                    </option>
                  ))}
                </select>
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
                  <TableHead>Employees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      No branches found. Create your first branch to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((branch) => {
                    const branchEmployees = allEmployees.filter(emp => emp.branchId === branch.id);
                    return (
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
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {branchEmployees.length === 0 ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : (
                              branchEmployees.map((emp) => (
                                <span
                                  key={emp.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-primary transition-colors"
                                  onClick={() => setViewingEmployee(emp)}
                                  title="View Employee Details"
                                >
                                  {emp.firstName} {emp.lastName ?? ""}
                                </span>
                              ))
                            )}
                          </div>
                        </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                            onClick={() => {
                              setViewingBranch(branch);
                              loadBranchEmployees(branch.id);
                            }}
                            disabled={isPending}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                            onClick={() => setEditingBranch(branch)}
                            disabled={isPending}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                            onClick={() => handleDelete(branch.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})
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
                  <Tabs defaultValue="branch-tree" className="w-full">
                    <div className="flex justify-center mb-6">
                      <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1">
                        <TabsTrigger value="branch-tree" className="text-xs">Branch Hierarchy Directory</TabsTrigger>
                        <TabsTrigger value="org-chart" className="text-xs">Reporting Structure Org Chart</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="branch-tree">
                      <BranchHierarchyTree
                        branches={initialData}
                        employees={allEmployees}
                      />
                    </TabsContent>
                    <TabsContent value="org-chart" className="space-y-6">
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
                                  <span className="p-1.5 rounded-lg bg-zinc-105 dark:bg-zinc-800/80"><Mail className="h-4 w-4 text-muted-foreground" /></span>
                                  <span className="truncate">{selectedEmployee.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                                  <span className="p-1.5 rounded-lg bg-zinc-105 dark:bg-zinc-800/80"><Phone className="h-4 w-4 text-muted-foreground" /></span>
                                  <span>{selectedEmployee.phone || "No phone added"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                                  <span className="p-1.5 rounded-lg bg-zinc-105 dark:bg-zinc-800/80"><User className="h-4 w-4 text-muted-foreground" /></span>
                                  <span>ID: {selectedEmployee.employeeId}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                                  <span className="p-1.5 rounded-lg bg-zinc-105 dark:bg-zinc-800/80"><Calendar className="h-4 w-4 text-muted-foreground" /></span>
                                  <span>Joined: {new Date(selectedEmployee.dateOfJoining).toLocaleDateString()}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 pt-4 justify-center md:justify-start">
                                {selectedEmployee.userId ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs gap-1.5 border-indigo-600/30 hover:border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                      onClick={() => router.push(`/office/messaging?userId=${selectedEmployee.userId}`)}
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" />
                                      Message
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs gap-1.5 border-emerald-600/30 hover:border-emerald-600 text-emerald-600 dark:text-emerald-400"
                                      onClick={() => router.push(`/office/calls?calleeId=${selectedEmployee.userId}&type=AUDIO`)}
                                    >
                                      <PhoneCall className="h-3.5 w-3.5" />
                                      Audio Call
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs gap-1.5 border-rose-600/30 hover:border-rose-600 text-rose-600 dark:text-rose-400"
                                      onClick={() => router.push(`/office/calls?calleeId=${selectedEmployee.userId}&type=VIDEO`)}
                                    >
                                      <Video className="h-3.5 w-3.5" />
                                      Video Call
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                                    No System Account (Cannot Message/Call)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Branch Dialog */}
      <Dialog open={!!viewingBranch} onOpenChange={(open) => !open && setViewingBranch(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Branch Details — {viewingBranch?.name}</DialogTitle>
          </DialogHeader>
          {viewingBranch && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs block">Branch Name</Label>
                  <span className="font-semibold">{viewingBranch.name}</span>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs block">Type</Label>
                  <span className="font-semibold">
                    {viewingBranch.isHeadOffice ? "Head Office" : "Branch Office"}
                  </span>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-xs block">Address</Label>
                  <span>{viewingBranch.address || "—"}</span>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs block">City</Label>
                  <span>{viewingBranch.city || "—"}</span>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs block">State</Label>
                  <span>{viewingBranch.state || "—"}</span>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs block">Phone</Label>
                  <span>{viewingBranch.phone || "—"}</span>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs block">Email</Label>
                  <span className="truncate block max-w-[150px]">{viewingBranch.email || "—"}</span>
                </div>
                <div className="col-span-2 border-t pt-3 mt-1 space-y-1">
                  <Label className="text-muted-foreground text-xs block">Branch Head</Label>
                  {viewingBranch.branchHead ? (
                    <div className="space-y-1">
                      <span 
                        className="font-bold text-sm text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline"
                        onClick={() => setViewingEmployee(viewingBranch.branchHead)}
                        title="View Head Profile"
                      >
                        {viewingBranch.branchHead.firstName} {viewingBranch.branchHead.lastName || ""}
                      </span>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
                        <div>
                          <span className="text-zinc-400">ID:</span> <span className="font-medium text-zinc-700 dark:text-zinc-300">{viewingBranch.branchHead.employeeId}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Role:</span> <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate inline-block max-w-[90px]">{viewingBranch.branchHead.designation || "Head"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-zinc-400">Email:</span> <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate inline-block max-w-[170px]" title={viewingBranch.branchHead.email}>{viewingBranch.branchHead.email}</span>
                        </div>
                        {viewingBranch.branchHead.phone && (
                          <div className="col-span-2">
                            <span className="text-zinc-400">Phone:</span> <span className="font-medium text-zinc-700 dark:text-zinc-300">{viewingBranch.branchHead.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No Head Designated</span>
                  )}
                </div>
              </div>

              {/* Assigned Employees (Read-only list) */}
              <div className="border-t pt-3 mt-1 space-y-2">
                <Label className="text-muted-foreground text-xs block">Assigned Employees ({selectedBranchEmployees.length})</Label>
                {loadingBranchEmployees ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : selectedBranchEmployees.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No employees in this branch.</p>
                ) : (
                  <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                    {selectedBranchEmployees.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-850">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p
                            className="text-xs font-semibold text-zinc-950 dark:text-zinc-50 truncate cursor-pointer hover:underline hover:text-primary"
                            onClick={() => setViewingEmployee(emp)}
                            title="View Employee Profile"
                          >
                            {emp.firstName} {emp.lastName ?? ""}
                          </p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
                            <div>
                              <span className="text-zinc-400">ID:</span> <span className="font-medium text-zinc-700 dark:text-zinc-300">{emp.employeeId}</span>
                            </div>
                            <div>
                              <span className="text-zinc-400">Role:</span> <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate inline-block max-w-[90px]" title={emp.designation || "Staff Member"}>{emp.designation || "Staff Member"}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-zinc-400">Email:</span> <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate inline-block max-w-[170px]" title={emp.email}>{emp.email}</span>
                            </div>
                            {emp.phone && (
                              <div className="col-span-2">
                                <span className="text-zinc-400">Phone:</span> <span className="font-medium text-zinc-700 dark:text-zinc-300">{emp.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setViewingBranch(null)}>
              Close
            </Button>
          </div>
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
              <div className="space-y-2">
                <Label htmlFor="edit-branchHeadId">Branch Head</Label>
                <select
                  name="branchHeadId"
                  id="edit-branchHeadId"
                  defaultValue={editingBranch.branchHeadId ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none"
                >
                  <option value="">Select Branch Head...</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} {emp.designation ? `(${emp.designation})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-employeeId">Assign Employee</Label>
                <select
                  name="employeeId"
                  id="edit-employeeId"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none cursor-pointer"
                >
                  <option value="">Select Employee to Assign...</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName ?? ""} {emp.designation ? `(${emp.designation})` : ""}
                    </option>
                  ))}
                </select>
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

      {/* Employee Details Dialog */}
      <Dialog open={!!viewingEmployee} onOpenChange={(open) => !open && setViewingEmployee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Profile</DialogTitle>
          </DialogHeader>
          {viewingEmployee && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-150 dark:border-zinc-800">
                <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                  <User className="h-6 w-6 text-zinc-500" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                    {viewingEmployee.firstName} {viewingEmployee.lastName ?? ""}
                  </h4>
                  <p className="text-xs text-muted-foreground">{viewingEmployee.designation || "Staff Member"}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-900">
                  <span className="text-muted-foreground font-medium">Employee ID:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{viewingEmployee.employeeId}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-900">
                  <span className="text-muted-foreground font-medium">Email:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{viewingEmployee.email}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground font-medium">Phone:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{viewingEmployee.phone || "—"}</span>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setViewingEmployee(null)} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
