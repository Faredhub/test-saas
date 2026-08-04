"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Search, Loader2, Users, Pencil, Upload, Download, Eye, Trash2 } from "lucide-react";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  getDepartments,
  importEmployees,
  deleteEmployee,
} from "@/lib/actions/hrm";
import { getDesignations } from "@/lib/actions/organization";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type EmployeesData = Awaited<ReturnType<typeof getEmployees>>;
type DeptData = Awaited<ReturnType<typeof getDepartments>>;

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-red-100 text-red-700",
  ON_NOTICE: "bg-amber-100 text-amber-700",
  RESIGNED: "bg-gray-100 text-gray-700",
  TERMINATED: "bg-red-100 text-red-700",
  ON_LEAVE: "bg-blue-100 text-blue-700",
};

export function EmployeesClient() {
  const [data, setData] = useState<EmployeesData | null>(null);
  const [departments, setDepartments] = useState<DeptData>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeesData["data"][number] | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editingEmployee = data?.data.find((e) => e.id === editingEmployeeId) || null;

  // Designation dropdown states
  const [designations, setDesignations] = useState<any[]>([]);
  const [addDeptId, setAddDeptId] = useState<string>("");
  const [addDesignationId, setAddDesignationId] = useState<string>("");
  const [editDeptId, setEditDeptId] = useState<string>("");
  const [editDesignationId, setEditDesignationId] = useState<string>("");

  const [addAvatar, setAddAvatar] = useState<string | null>(null);
  const [editAvatar, setEditAvatar] = useState<string | null>(null);

  const addAvatarInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  function getInitials(firstName: string, lastName?: string | null) {
    const f = firstName ? firstName[0].toUpperCase() : "";
    const l = lastName ? lastName[0].toUpperCase() : "";
    return f + l;
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size exceeds 2MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      if (isEdit) {
        setEditAvatar(base64);
      } else {
        setAddAvatar(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (editingEmployeeId && data) {
      const emp = data.data.find((e) => e.id === editingEmployeeId);
      if (emp) {
        setEditDeptId(emp.departmentId || "");
        setEditDesignationId(emp.designationId || "");
        setEditAvatar(emp.avatar || null);
      }
    } else {
      setEditDeptId("");
      setEditDesignationId("");
      setEditAvatar(null);
    }
  }, [editingEmployeeId, data]);

  useEffect(() => {
    if (!isOpen) {
      setAddDeptId("");
      setAddDesignationId("");
      setAddAvatar(null);
    }
  }, [isOpen]);

  function loadData() {
    startTransition(async () => {
      try {
        const [empData, deptData, desgData] = await Promise.all([
          getEmployees({
            search: search || undefined,
            departmentId: deptFilter || undefined,
            pageSize: 100,
          }),
          getDepartments(),
          getDesignations(),
        ]);
        setData(empData);
        setDepartments(deptData);
        setDesignations(desgData);
      } catch {
        toast.error("Failed to load employees");
      }
    });
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    loadData();
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const res = await createEmployee({
          employeeId: formData.get("employeeId") as string,
          firstName: formData.get("firstName") as string,
          middleName: (formData.get("middleName") as string) || undefined,
          lastName: (formData.get("lastName") as string) || undefined,
          email: formData.get("email") as string,
          phone: (formData.get("phone") as string) || undefined,
          designationId: addDesignationId || undefined,
          departmentId: addDeptId || undefined,
          dateOfJoining: formData.get("dateOfJoining") as string,
          employmentType: (formData.get("employmentType") as string) || "FULL_TIME",
          gender: (formData.get("gender") as string) || undefined,
          ctc: formData.get("ctc") ? Number(formData.get("ctc")) : undefined,
          avatar: addAvatar || undefined,
          password: (formData.get("password") as string) || "Emp@1234",
        });
        if (res && !res.success) {
          toast.error(res.error || "Failed to create employee");
          return;
        }
        toast.success("Employee created successfully");
        setIsOpen(false);
        loadData();
      } catch (err: any) {
        toast.error(err?.message || "Failed to create employee");
      }
    });
  }

  async function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      try {
        const res = await updateEmployee(id, {
          status: status as "ACTIVE" | "INACTIVE" | "ON_NOTICE" | "RESIGNED" | "TERMINATED" | "ON_LEAVE",
        });
        if (res && !res.success) {
          toast.error(res.error || "Failed to update status");
          return;
        }
        toast.success(`Status updated to ${status === "ACTIVE" ? "Active" : status === "INACTIVE" ? "Inactive" : status.replace("_", " ")}`);
        loadData();
      } catch (err: any) {
        toast.error(err?.message || "Failed to update status");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this employee? This action cannot be undone.")) return;
    startTransition(async () => {
      try {
        const res = await deleteEmployee(id);
        if (res && !res.success) {
          toast.error(res.error || "Failed to delete employee");
          return;
        }
        toast.success("Employee deleted successfully");
        loadData();
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete employee");
      }
    });
  }

  async function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      try {
        const res = await updateEmployee(id, {
          firstName: formData.get("firstName") as string,
          middleName: (formData.get("middleName") as string) || null,
          lastName: (formData.get("lastName") as string) || undefined,
          email: formData.get("email") as string,
          phone: (formData.get("phone") as string) || undefined,
          designationId: editDesignationId || null,
          departmentId: editDeptId || undefined,
          dateOfJoining: (formData.get("dateOfJoining") as string) || undefined,
          employmentType: (formData.get("employmentType") as string) || "FULL_TIME",
          gender: (formData.get("gender") as string) || undefined,
          ctc: formData.get("ctc") ? Number(formData.get("ctc")) : undefined,
          avatar: editAvatar,
          password: (formData.get("password") as string) || undefined,
        });
        if (res && !res.success) {
          toast.error(res.error || "Failed to update employee");
          return;
        }
        toast.success("Employee updated successfully");
        setEditingEmployeeId(null);
        loadData();
      } catch (err: any) {
        toast.error(err?.message || "Failed to update employee");
      }
    });
  }

  function handleDownloadTemplate() {
    const headers = [
      {
        "Employee ID": "EMP-001",
        "First Name": "John",
        "Middle Name": "Robert",
        "Last Name": "Doe",
        "Email": "john.doe@example.com",
        "Phone": "9876543210",
        "Designation": "Software Engineer",
        "Department ID": "",
        "Date of Joining": "2026-06-01",
        "Employment Type": "FULL_TIME",
        "CTC": 850000
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "employee_template.xlsx");
    toast.success("Excel template downloaded!");
  }

  function handleExcelClick() {
    fileInputRef.current?.click();
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = evt.target?.result;
            if (!data) return;
            const workbook = XLSX.read(data, { type: "binary" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
              toast.error("The Excel file is empty.");
              return;
            }

            // Map standard Excel header variations to database fields
            const employeesToImport = json.map((row) => ({
              employeeId: String(row.employeeId || row["Employee ID"] || row["ID"] || "").trim(),
              firstName: String(row.firstName || row["First Name"] || row["Name"] || "").trim(),
              middleName: String(row.middleName || row["Middle Name"] || "").trim() || undefined,
              lastName: String(row.lastName || row["Last Name"] || "").trim() || undefined,
              email: String(row.email || row["Email"] || "").trim(),
              phone: String(row.phone || row["Phone"] || row["Mobile"] || "").trim() || undefined,
              designation: String(row.designation || row["Designation"] || row["Role"] || "").trim() || undefined,
              departmentId: String(row.departmentId || row["Department ID"] || "").trim() || undefined,
              dateOfJoining: String(row.dateOfJoining || row["Date of Joining"] || row["Joining Date"] || "").trim() || undefined,
              employmentType: String(row.employmentType || row["Employment Type"] || "").trim() || undefined,
              ctc: row.ctc || row["CTC"] || row["Salary"] ? Number(row.ctc || row["CTC"] || row["Salary"]) : undefined,
            }));

            const res = await importEmployees(employeesToImport);

            if (res && res.success) {
              if (res.errors && res.errors.length > 0) {
                toast.warning(`Imported ${res.count} employees with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
              } else {
                toast.success(`Successfully imported ${res.count} employees!`);
              }
              loadData();
            } else {
              toast.error(res?.error || "Failed to import employees");
            }
          } catch (err: any) {
            toast.error(`Error parsing Excel: ${err.message}`);
          }
        };
        reader.readAsBinaryString(file);
      } catch (err: any) {
        toast.error(`Failed to read file: ${err.message}`);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  const filtered = data?.data.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.firstName.toLowerCase().includes(q) ||
      (e.middleName ?? "").toLowerCase().includes(q) ||
      (e.lastName ?? "").toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Directory</h1>
          <p className="text-muted-foreground">
            {data?.total ?? 0} employees
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelUpload}
            accept=".xlsx, .xls"
            className="hidden"
          />
          {/* <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
          >
            <Download className="h-4 w-4" /> Download Template
          </Button> */}

          <a href="/office/spreadsheets?template=employees&source=hrm-employees">
            <Button
              variant="outline"
              disabled={isPending}
              className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
            >
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
          </a>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
                <Plus className="h-4 w-4" /> Add Employee
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="space-y-4">
                {/* Avatar upload */}
                <div className="flex items-center gap-4 py-3 border-b border-muted">
                  <Avatar size="lg" className="h-16 w-16 border border-muted">
                    {addAvatar && <AvatarImage src={addAvatar} alt="Employee Avatar" />}
                    <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                      New
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold">Profile Photo</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs cursor-pointer"
                        onClick={() => addAvatarInputRef.current?.click()}
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Image
                      </Button>
                      {addAvatar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          onClick={() => setAddAvatar(null)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">JPG or PNG. Max 2MB.</p>
                    <input
                      type="file"
                      ref={addAvatarInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleAvatarChange(e, false)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input id="employeeId" name="employeeId" placeholder="EMP-001" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Login Password *</Label>
                  <Input id="password" name="password" type="text" defaultValue="Emp@1234" placeholder="Emp@1234" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" name="firstName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input id="middleName" name="middleName" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select name="gender">
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department</Label>
                  <Select
                    name="departmentId"
                    value={addDeptId}
                    onValueChange={(val) => {
                      setAddDeptId(val || "");
                      setAddDesignationId("");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designationId">Designation</Label>
                  <Select
                    name="designationId"
                    value={addDesignationId}
                    onValueChange={(val) => setAddDesignationId(val || "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={addDeptId ? "Select Designation" : "Select Department First"} />
                    </SelectTrigger>
                    <SelectContent>
                      {designations
                        .filter((d) => d.departmentId === addDeptId)
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                  <Input id="dateOfJoining" name="dateOfJoining" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select name="employmentType" defaultValue="FULL_TIME">
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctc">CTC (Annual)</Label>
                  <Input id="ctc" name="ctc" type="number" step="0.01" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Employee
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Select value={deptFilter} onValueChange={(v: string | null) => { setDeptFilter(!v || v === "all" ? "" : v); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!data ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4" />
              <p>No employees found</p>
            </div>
          ) : (
                        <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[320px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <Avatar className="h-9 w-9 border border-muted">
                        {emp.avatar && <AvatarImage src={emp.avatar} alt={`${emp.firstName} ${emp.lastName || ""}`} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {getInitials(emp.firstName, emp.lastName)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{emp.employeeId}</TableCell>
                    <TableCell className="font-medium">
                      {emp.firstName} {emp.middleName ? emp.middleName + " " : ""}{emp.lastName ?? ""}
                    </TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{emp.designation ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{emp.employmentType.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center p-0.5 rounded-lg bg-gray-100 border border-gray-200 shadow-xs dark:bg-slate-800 dark:border-slate-700">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleStatusChange(emp.id, "ACTIVE")}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                              emp.status === "ACTIVE"
                                ? "bg-emerald-600 text-white font-semibold shadow-xs"
                                : "text-gray-600 hover:text-emerald-700 hover:bg-emerald-50/60 dark:text-gray-300"
                            }`}
                          >
                            Active
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleStatusChange(emp.id, "INACTIVE")}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                              emp.status === "INACTIVE" || emp.status === "TERMINATED" || emp.status === "RESIGNED"
                                ? "bg-rose-600 text-white font-semibold shadow-xs"
                                : "text-gray-600 hover:text-rose-700 hover:bg-rose-50/60 dark:text-gray-300"
                            }`}
                          >
                            Inactive
                          </button>
                        </div>
                        {emp.status !== "ACTIVE" && emp.status !== "INACTIVE" && (
                          <Badge className={statusColors[emp.status] ?? ""}>
                            {emp.status.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <Select
                          value={emp.status}
                          onValueChange={(v: string | null) => v && handleStatusChange(emp.id, v)}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                            <SelectItem value="ON_NOTICE">On Notice</SelectItem>
                            <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                            <SelectItem value="RESIGNED">Resigned</SelectItem>
                            <SelectItem value="TERMINATED">Terminated</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                          onClick={() => setSelectedEmployee(emp)}
                          type="button"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-900 hover:text-black hover:bg-neutral-100 cursor-pointer"
                          onClick={() => setEditingEmployeeId(emp.id)}
                          type="button"
                          title="Edit Employee"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                          onClick={() => handleDelete(emp.id)}
                          disabled={isPending}
                          type="button"
                          title="Delete Employee"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

            {/* Edit Employee Details Dialog */}
      {editingEmployee && (
        <Dialog open={!!editingEmployeeId} onOpenChange={(open) => !open && setEditingEmployeeId(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee Details</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await handleUpdate(editingEmployee.id, formData);
              }}
              className="space-y-4"
            >
              {/* Avatar upload */}
              <div className="flex items-center gap-4 py-3 border-b border-muted">
                <Avatar size="lg" className="h-16 w-16 border border-muted">
                  {editAvatar && <AvatarImage src={editAvatar} alt="Employee Avatar" />}
                  <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                    {getInitials(editingEmployee.firstName, editingEmployee.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Profile Photo</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs cursor-pointer"
                      onClick={() => editAvatarInputRef.current?.click()}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Image
                    </Button>
                    {editAvatar && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        onClick={() => setEditAvatar(null)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">JPG or PNG. Max 2MB.</p>
                  <input
                    type="file"
                    ref={editAvatarInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleAvatarChange(e, true)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-employeeId">Employee ID</Label>
                  <Input
                    id="edit-employeeId"
                    name="employeeId"
                    defaultValue={editingEmployee.employeeId}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    defaultValue={editingEmployee.email}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">Reset Login Password</Label>
                  <Input
                    id="edit-password"
                    name="password"
                    type="text"
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name *</Label>
                  <Input
                    id="edit-firstName"
                    name="firstName"
                    defaultValue={editingEmployee.firstName}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-middleName">Middle Name</Label>
                  <Input
                    id="edit-middleName"
                    name="middleName"
                    defaultValue={editingEmployee.middleName ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    name="lastName"
                    defaultValue={editingEmployee.lastName ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    name="phone"
                    defaultValue={editingEmployee.phone ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-departmentId">Department</Label>
                  <Select
                    name="departmentId"
                    value={editDeptId}
                    onValueChange={(val) => {
                      setEditDeptId(val || "");
                      setEditDesignationId("");
                    }}
                  >
                    <SelectTrigger id="edit-departmentId" className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-designationId">Designation</Label>
                  <Select
                    name="designationId"
                    value={editDesignationId}
                    onValueChange={(val) => setEditDesignationId(val || "")}
                  >
                    <SelectTrigger id="edit-designationId" className="w-full">
                      <SelectValue placeholder={editDeptId ? "Select Designation" : "Select Department First"} />
                    </SelectTrigger>
                    <SelectContent>
                      {designations
                        .filter((d) => d.departmentId === editDeptId)
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gender">Gender</Label>
                  <Select name="gender" defaultValue={editingEmployee.gender ?? undefined}>
                    <SelectTrigger id="edit-gender" className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dateOfJoining">Date of Joining *</Label>
                  <Input
                    id="edit-dateOfJoining"
                    name="dateOfJoining"
                    type="date"
                    defaultValue={editingEmployee.dateOfJoining ? new Date(editingEmployee.dateOfJoining).toISOString().slice(0, 10) : ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-employmentType">Employment Type</Label>
                  <Select name="employmentType" defaultValue={editingEmployee.employmentType}>
                    <SelectTrigger id="edit-employmentType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ctc">CTC (Annual)</Label>
                  <Input
                    id="edit-ctc"
                    name="ctc"
                    type="number"
                    step="0.01"
                    defaultValue={editingEmployee.ctc ? Number(editingEmployee.ctc) : ""}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 text-right">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* View Employee Details Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <button className="sr-only" autoFocus aria-hidden="true">Start of dialog</button>
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6 pt-2">
              {/* Header section with Name & Designation */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/10">
                    {selectedEmployee.avatar && <AvatarImage src={selectedEmployee.avatar} alt={`${selectedEmployee.firstName} ${selectedEmployee.lastName || ""}`} />}
                    <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                      {getInitials(selectedEmployee.firstName, selectedEmployee.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {selectedEmployee.firstName} {selectedEmployee.middleName ? selectedEmployee.middleName + " " : ""}{selectedEmployee.lastName ?? ""}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedEmployee.designation || "No Designation"} — {departments.find((d) => d.id === selectedEmployee.departmentId)?.name || "No Department"}
                    </p>
                  </div>
                </div>
                <Badge className={statusColors[selectedEmployee.status] ?? ""}>
                  {selectedEmployee.status.replace("_", " ")}
                </Badge>
              </div>

              {/* Multi-column structured metadata layout */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Personal Information Card */}
                <Card className="bg-muted/10 border-muted">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold text-primary">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 text-xs">
                    <div className="flex flex-col">
                      <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                        <span className="text-muted-foreground font-medium">Email:</span>
                        <span className="font-semibold text-foreground truncate" title={selectedEmployee.email}>
                          {selectedEmployee.email}
                        </span>
                      </div>
                      {selectedEmployee.phone && (
                        <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                          <span className="text-muted-foreground font-medium">Phone:</span>
                          <span className="font-semibold text-foreground">{selectedEmployee.phone}</span>
                        </div>
                      )}
                      {selectedEmployee.dateOfBirth && (
                        <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                          <span className="text-muted-foreground font-medium">Date of Birth:</span>
                          <span className="font-semibold text-foreground">
                            {new Date(selectedEmployee.dateOfBirth).toLocaleDateString("en-US", { dateStyle: "medium" })}
                          </span>
                        </div>
                      )}
                      {selectedEmployee.gender && selectedEmployee.gender !== "-" && (
                        <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                          <span className="text-muted-foreground font-medium">Gender:</span>
                          <span className="font-semibold text-foreground">{selectedEmployee.gender}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Employment Information Card */}
                <Card className="bg-muted/10 border-muted">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold text-primary">Employment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 text-xs">
                    <div className="flex flex-col">
                      <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                        <span className="text-muted-foreground font-medium">Employee ID:</span>
                        <span className="font-bold text-foreground">{selectedEmployee.employeeId}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                        <span className="text-muted-foreground font-medium">Type:</span>
                        <span className="font-semibold text-foreground">{selectedEmployee.employmentType.replace("_", " ")}</span>
                      </div>
                      {selectedEmployee.dateOfJoining && (
                        <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                          <span className="text-muted-foreground font-medium">Date of Joining:</span>
                          <span className="font-semibold text-foreground">
                            {new Date(selectedEmployee.dateOfJoining).toLocaleDateString("en-US", { dateStyle: "medium" })}
                          </span>
                        </div>
                      )}
                      {selectedEmployee.reportingTo && (
                        <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                          <span className="text-muted-foreground font-medium">Reporting To:</span>
                          <span className="font-semibold text-foreground truncate">
                            {selectedEmployee.reportingTo.firstName} {selectedEmployee.reportingTo.lastName ?? ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Bank Details Card */}
                {!!(
                  selectedEmployee.ctc ||
                  selectedEmployee.bankName ||
                  selectedEmployee.bankAccountNo ||
                  selectedEmployee.ifscCode
                ) && (
                  <Card className="bg-muted/10 border-muted">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-semibold text-primary">Compensation & Bank Details</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 text-xs">
                      <div className="flex flex-col">
                        {selectedEmployee.ctc && (
                          <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                            <span className="text-muted-foreground font-medium">Annual CTC:</span>
                            <span className="font-bold text-green-600">
                              ₹{Number(selectedEmployee.ctc).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                        {selectedEmployee.bankName && (
                          <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                            <span className="text-muted-foreground font-medium">Bank Name:</span>
                            <span className="font-semibold text-foreground truncate">{selectedEmployee.bankName}</span>
                          </div>
                        )}
                        {selectedEmployee.bankAccountNo && (
                          <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                            <span className="text-muted-foreground font-medium">Account No:</span>
                            <span className="font-semibold text-foreground font-mono">{selectedEmployee.bankAccountNo}</span>
                          </div>
                        )}
                        {selectedEmployee.ifscCode && (
                          <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                            <span className="text-muted-foreground font-medium">IFSC Code:</span>
                            <span className="font-semibold text-foreground font-mono">{selectedEmployee.ifscCode}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Government IDs Card */}
                {!!(
                  selectedEmployee.panNumber ||
                  selectedEmployee.aadharNumber ||
                  selectedEmployee.pfNumber ||
                  selectedEmployee.esiNumber ||
                  selectedEmployee.uanNumber
                ) && (
                  <Card className="bg-muted/10 border-muted">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-semibold text-primary">Government IDs & Tax Info</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 text-xs">
                      <div className="flex flex-col">
                        {selectedEmployee.panNumber && (
                          <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                            <span className="text-muted-foreground font-medium">PAN Number:</span>
                            <span className="font-semibold text-foreground font-mono uppercase">{selectedEmployee.panNumber}</span>
                          </div>
                        )}
                        {selectedEmployee.aadharNumber && (
                          <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                            <span className="text-muted-foreground font-medium">Aadhar Number:</span>
                            <span className="font-semibold text-foreground font-mono">{selectedEmployee.aadharNumber}</span>
                          </div>
                        )}
                        {selectedEmployee.pfNumber && (
                          <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                            <span className="text-muted-foreground font-medium">PF Number:</span>
                            <span className="font-semibold text-foreground font-mono">{selectedEmployee.pfNumber}</span>
                          </div>
                        )}
                        {selectedEmployee.esiNumber && (
                          <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                            <span className="text-muted-foreground font-medium">ESI Number:</span>
                            <span className="font-semibold text-foreground font-mono">{selectedEmployee.esiNumber}</span>
                          </div>
                        )}
                        {selectedEmployee.uanNumber && (
                          <div className="grid grid-cols-[120px_1fr] gap-x-2 py-2 border-b border-muted/50 last:border-0 items-center">
                            <span className="text-muted-foreground font-medium">UAN Number:</span>
                            <span className="font-semibold text-foreground font-mono">{selectedEmployee.uanNumber}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t mt-4">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
                  Close
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}