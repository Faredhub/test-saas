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
import { Plus, Search, Loader2, Users, Pencil, Upload, Download } from "lucide-react";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  getDepartments,
  importEmployees,
} from "@/lib/actions/hrm";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type EmployeesData = Awaited<ReturnType<typeof getEmployees>>;
type DeptData = Awaited<ReturnType<typeof getDepartments>>;

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
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
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadData() {
    startTransition(async () => {
      try {
        const [empData, deptData] = await Promise.all([
          getEmployees({
            search: search || undefined,
            departmentId: deptFilter || undefined,
            pageSize: 100,
          }),
          getDepartments(),
        ]);
        setData(empData);
        setDepartments(deptData);
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
          designation: (formData.get("designation") as string) || undefined,
          departmentId: (formData.get("departmentId") as string) || undefined,
          dateOfJoining: formData.get("dateOfJoining") as string,
          employmentType: (formData.get("employmentType") as string) || "FULL_TIME",
          gender: (formData.get("gender") as string) || undefined,
          ctc: formData.get("ctc") ? Number(formData.get("ctc")) : undefined,
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
          status: status as "ACTIVE" | "ON_NOTICE" | "RESIGNED" | "TERMINATED" | "ON_LEAVE",
        });
        if (res && !res.success) {
          toast.error(res.error || "Failed to update status");
          return;
        }
        toast.success("Status updated");
        loadData();
      } catch (err: any) {
        toast.error(err?.message || "Failed to update status");
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
          designation: (formData.get("designation") as string) || undefined,
          departmentId: (formData.get("departmentId") as string) || undefined,
          dateOfJoining: (formData.get("dateOfJoining") as string) || undefined,
          employmentType: (formData.get("employmentType") as string) || "FULL_TIME",
          gender: (formData.get("gender") as string) || undefined,
          ctc: formData.get("ctc") ? Number(formData.get("ctc")) : undefined,
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
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
          >
            <Download className="h-4 w-4" /> Download Template
          </Button>
          <Button
            variant="outline"
            onClick={handleExcelClick}
            disabled={isPending}
            className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
          >
            <Upload className="h-4 w-4" /> Import Excel
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
                <Plus className="h-4 w-4" /> Add Employee
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="space-y-4">
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
                  <Label htmlFor="designation">Designation</Label>
                  <Input id="designation" name="designation" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department</Label>
                  <Select name="departmentId">
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
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
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Editing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((emp) => (
                  <TableRow key={emp.id}>
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
                      <Badge className={statusColors[emp.status] ?? ""}>
                        {emp.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={emp.status}
                        onValueChange={(v: string | null) => v && handleStatusChange(emp.id, v)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="ON_NOTICE">On Notice</SelectItem>
                          <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                          <SelectItem value="RESIGNED">Resigned</SelectItem>
                          <SelectItem value="TERMINATED">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Dialog
                        open={editingEmployeeId === emp.id}
                        onOpenChange={(open) => setEditingEmployeeId(open ? emp.id : null)}
                      >
                        <DialogTrigger className="inline-flex items-center justify-center rounded-md hover:bg-muted h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer">
                          <Pencil className="h-4 w-4" />
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Employee Details</DialogTitle>
                          </DialogHeader>
                          <form
                            action={async (formData) => {
                              await handleUpdate(emp.id, formData);
                            }}
                            className="space-y-4"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`employeeId-${emp.id}`}>Employee ID</Label>
                                <Input
                                  id={`employeeId-${emp.id}`}
                                  name="employeeId"
                                  defaultValue={emp.employeeId}
                                  disabled
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`email-${emp.id}`}>Email *</Label>
                                <Input
                                  id={`email-${emp.id}`}
                                  name="email"
                                  type="email"
                                  defaultValue={emp.email}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`firstName-${emp.id}`}>First Name *</Label>
                                <Input
                                  id={`firstName-${emp.id}`}
                                  name="firstName"
                                  defaultValue={emp.firstName}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`middleName-${emp.id}`}>Middle Name</Label>
                                <Input
                                  id={`middleName-${emp.id}`}
                                  name="middleName"
                                  defaultValue={emp.middleName ?? ""}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`lastName-${emp.id}`}>Last Name</Label>
                                <Input
                                  id={`lastName-${emp.id}`}
                                  name="lastName"
                                  defaultValue={emp.lastName ?? ""}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`phone-${emp.id}`}>Phone</Label>
                                <Input
                                  id={`phone-${emp.id}`}
                                  name="phone"
                                  defaultValue={emp.phone ?? ""}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`gender-${emp.id}`}>Gender</Label>
                                <Select name="gender" defaultValue={emp.gender ?? undefined}>
                                  <SelectTrigger id={`gender-${emp.id}`} className="w-full">
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
                                <Label htmlFor={`designation-${emp.id}`}>Designation</Label>
                                <Input
                                  id={`designation-${emp.id}`}
                                  name="designation"
                                  defaultValue={emp.designation ?? ""}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`departmentId-${emp.id}`}>Department</Label>
                                <Select name="departmentId" defaultValue={emp.departmentId ?? undefined}>
                                  <SelectTrigger id={`departmentId-${emp.id}`} className="w-full">
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
                                <Label htmlFor={`dateOfJoining-${emp.id}`}>Date of Joining *</Label>
                                <Input
                                  id={`dateOfJoining-${emp.id}`}
                                  name="dateOfJoining"
                                  type="date"
                                  defaultValue={emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().slice(0, 10) : ""}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`employmentType-${emp.id}`}>Employment Type</Label>
                                <Select name="employmentType" defaultValue={emp.employmentType}>
                                  <SelectTrigger id={`employmentType-${emp.id}`} className="w-full">
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
                                <Label htmlFor={`ctc-${emp.id}`}>CTC (Annual)</Label>
                                <Input
                                  id={`ctc-${emp.id}`}
                                  name="ctc"
                                  type="number"
                                  step="0.01"
                                  defaultValue={emp.ctc ? Number(emp.ctc) : ""}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
