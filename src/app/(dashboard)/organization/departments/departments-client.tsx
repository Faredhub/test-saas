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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Loader2, Building2, Trash2, Eye, Pencil, Mail, Calendar, User, Phone } from "lucide-react";
import { createDepartment, deleteDepartment, updateDepartment, getDepartmentEmployees } from "@/lib/actions/organization";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgChart } from "@/components/layout/org-chart";

type Department = Awaited<ReturnType<typeof import("@/lib/actions/organization").getDepartments>>[number];

type DepartmentsClientProps = {
  initialData: Department[];
};

export function DepartmentsClient({ initialData }: DepartmentsClientProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Hierarchy view states
  const [activeTab, setActiveTab] = useState<"list" | "hierarchy">("list");
  const [selectedDeptForHierarchy, setSelectedDeptForHierarchy] = useState<string>("");
  const [hierarchyEmployees, setHierarchyEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  const handleDepartmentChange = async (deptId: string) => {
    setSelectedDeptForHierarchy(deptId);
    setSelectedEmployee(null);
    if (!deptId) {
      setHierarchyEmployees([]);
      return;
    }
    setLoadingEmployees(true);
    try {
      const employees = await getDepartmentEmployees(deptId);
      setHierarchyEmployees(employees);
    } catch {
      toast.error("Failed to load employees for hierarchy");
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "list" | "hierarchy");
    if (value === "hierarchy" && !selectedDeptForHierarchy && initialData.length > 0) {
      handleDepartmentChange(initialData[0].id);
    }
  };

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedDept) return;
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const name = formData.get("name") as string;
        const parentId = formData.get("parentId") as string;
        await updateDepartment(selectedDept.id, {
          name,
          parentId: parentId || null,
        });
        toast.success("Department updated successfully");
        setIsEditOpen(false);
      } catch {
        toast.error("Failed to update department");
      }
    });
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const parentId = formData.get("parentId") as string;
        await createDepartment({
          name: formData.get("name") as string,
          parentId: parentId || undefined,
        });
        toast.success("Department created successfully");
        setIsOpen(false);
      } catch {
        toast.error("Failed to create department");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteDepartment(id);
        toast.success("Department deleted");
      } catch {
        toast.error("Failed to delete department");
      }
    });
  }

  const filtered = initialData.filter((dept) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      dept.name.toLowerCase().includes(s) ||
      (dept.parent?.name?.toLowerCase().includes(s) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground">Manage organization departments and hierarchy</p>
        </div>

        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
            <TabsList>
              <TabsTrigger value="list">Table View</TabsTrigger>
              <TabsTrigger value="hierarchy">Hierarchy View</TabsTrigger>
            </TabsList>
          </Tabs>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Department
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Department</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Department Name *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentId">Parent Department</Label>
                  <select
                    name="parentId"
                    id="parentId"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">None (Top-level)</option>
                    {initialData.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Department
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
                  placeholder="Search departments..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1 w-full max-w-xs">
                <Label htmlFor="hierarchy-dept-select" className="text-xs text-muted-foreground">Select Department</Label>
                <select
                  id="hierarchy-dept-select"
                  value={selectedDeptForHierarchy}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Select a department...</option>
                  {initialData.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
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
                  <TableHead>Department Name</TableHead>
                  <TableHead>Parent Department</TableHead>
                  <TableHead>Sub-departments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      No departments found. Create your first department to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.parent?.name ?? "—"}</TableCell>
                      <TableCell>{dept.children?.length ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                            onClick={() => {
                              setSelectedDept(dept);
                              setIsViewOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                            onClick={() => {
                              setSelectedDept(dept);
                              setIsEditOpen(true);
                            }}
                            disabled={isPending}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                            onClick={() => handleDelete(dept.id)}
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
                  <p className="text-sm text-muted-foreground">Loading department hierarchy...</p>
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

      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Department Details</DialogTitle>
          </DialogHeader>
          <div key={selectedDept?.id} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Department Name</Label>
              <p className="text-sm font-semibold">{selectedDept?.name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Parent Department</Label>
              <p className="text-sm">{selectedDept?.parent?.name ?? "None (Top-level)"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Sub-departments</Label>
              {selectedDept?.children && selectedDept.children.length > 0 ? (
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {selectedDept.children.map((child: any) => (
                    <li key={child.id}>{child.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">No sub-departments</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Close
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <form key={selectedDept?.id} onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input id="edit-name" name="name" defaultValue={selectedDept?.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parentId">Parent Department</Label>
              <select
                name="parentId"
                id="edit-parentId"
                defaultValue={selectedDept?.parentId ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">None (Top-level)</option>
                {initialData
                  .filter((dept) => dept.id !== selectedDept?.id)
                  .map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
