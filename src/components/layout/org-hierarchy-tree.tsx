"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  ChevronRight,
  ChevronDown,
  User,
  Folder,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  designation?: string | null;
  departmentId?: string | null;
  branchId?: string | null;
}

interface DepartmentNode {
  id: string;
  name: string;
  parentId: string | null;
  children: DepartmentNode[];
  employees: EmployeeSummary[];
}

interface DepartmentHierarchyTreeProps {
  departments: any[];
  employees: any[];
}

interface BranchNode {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  isHeadOffice: boolean;
  branchHead?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    designation?: string | null;
  } | null;
  employees: EmployeeSummary[];
}

interface BranchHierarchyTreeProps {
  branches: any[];
  employees: any[];
}

// ============================================================================
// DEPARTMENT HIERARCHY TREE
// ============================================================================

export function DepartmentHierarchyTree({ departments, employees }: DepartmentHierarchyTreeProps) {
  // Build recursive department tree
  const tree = useMemo(() => {
    const map = new Map<string, DepartmentNode>();
    
    // Initialize nodes
    departments.forEach((d) => {
      map.set(d.id, {
        id: d.id,
        name: d.name,
        parentId: d.parentId,
        children: [],
        employees: employees.filter((emp) => emp.departmentId === d.id),
      });
    });

    const roots: DepartmentNode[] = [];

    // Link parents to children
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [departments, employees]);

  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-zinc-50/50 dark:bg-zinc-950/10">
        <Building2 className="h-8 w-8 text-zinc-400 mb-2" />
        <p className="text-sm font-semibold">No Departments Available</p>
        <p className="text-xs text-muted-foreground">Add a department to view the hierarchy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto p-2">
      {tree.map((root) => (
        <DepartmentTreeNode key={root.id} node={root} level={0} />
      ))}
    </div>
  );
}

function DepartmentTreeNode({ node, level }: { node: DepartmentNode; level: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const hasEmployees = node.employees.length > 0;

  return (
    <div className="space-y-2 select-none">
      {/* Node Row */}
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-zinc-900/90 shadow-sm transition-all duration-200 hover:border-primary/30 group",
          level > 0 ? "ml-6 border-l-2" : "border-zinc-200 dark:border-zinc-800"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Toggle Expand */}
          {(hasChildren || hasEmployees) ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center">
              <Folder className="h-4 w-4 text-zinc-400" />
            </div>
          )}

          {/* Department Info */}
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-sm truncate text-zinc-800 dark:text-zinc-200">
            {node.name}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary whitespace-nowrap">
            {node.employees.length} Employees
          </span>
          {hasChildren && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 whitespace-nowrap">
              {node.children.length} Sub-Depts
            </span>
          )}
        </div>
      </div>

      {/* Expanded Children & Employees */}
      {isExpanded && (hasChildren || hasEmployees) && (
        <div className={cn("space-y-2 border-l border-zinc-200 dark:border-zinc-800 ml-4 pl-4")}>
          {/* Sibling child departments */}
          {node.children.map((child) => (
            <DepartmentTreeNode key={child.id} node={child} level={level + 1} />
          ))}

          {/* Employees inside this department */}
          {node.employees.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/30 text-xs hover:border-primary/20 transition-all duration-200"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 border">
                  <User className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {emp.firstName} {emp.lastName ?? ""}
                  </p>
                  <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Briefcase className="h-3 w-3 inline" /> {emp.designation || "Staff Member"}
                  </p>
                </div>
              </div>

              {/* Employee Quick Contacts */}
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium">
                {emp.email && (
                  <span className="flex items-center gap-1 hover:text-primary cursor-pointer truncate max-w-[150px] md:max-w-none">
                    <Mail className="h-3 w-3" /> {emp.email}
                  </span>
                )}
                {emp.phone && (
                  <span className="flex items-center gap-1 hover:text-primary cursor-pointer">
                    <Phone className="h-3 w-3" /> {emp.phone}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BRANCH HIERARCHY TREE
// ============================================================================

export function BranchHierarchyTree({ branches, employees }: BranchHierarchyTreeProps) {
  // Sort branches to make sure Head Office is always at the top of the view
  const sortedBranches = useMemo(() => {
    const head = branches.filter((b) => b.isHeadOffice);
    const others = branches.filter((b) => !b.isHeadOffice);
    return [...head, ...others];
  }, [branches]);

  if (branches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-zinc-50/50 dark:bg-zinc-950/10">
        <MapPin className="h-8 w-8 text-zinc-400 mb-2" />
        <p className="text-sm font-semibold">No Branches Available</p>
        <p className="text-xs text-muted-foreground">Add a branch to view structural directory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-2">
      {/* Root node (Head Office) is displayed at the top, branching out to others */}
      {sortedBranches.map((branch, index) => {
        const branchEmployees = employees.filter((emp) => emp.branchId === branch.id);
        return (
          <div key={branch.id} className="relative">
            {/* Visual connector lines between branch cards if multiple exist */}
            {index > 0 && (
              <div className="absolute -top-6 left-6 h-6 w-px border-l-2 border-dashed border-zinc-300 dark:border-zinc-700" />
            )}
            
            <CardBranchNode branch={{ ...branch, employees: branchEmployees }} />
          </div>
        );
      })}
    </div>
  );
}

function CardBranchNode({ branch }: { branch: BranchNode & { employees: EmployeeSummary[] } }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasEmployees = branch.employees.length > 0;

  return (
    <div className="space-y-3">
      {/* Branch Card Box */}
      <div
        className={cn(
          "p-5 rounded-2xl border bg-white dark:bg-zinc-900/90 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20",
          branch.isHeadOffice
            ? "border-primary/30 ring-2 ring-primary/5 dark:ring-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent"
            : "border-zinc-200 dark:border-zinc-800"
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <MapPin className="h-4.5 w-4.5 text-primary" />
              <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200">
                {branch.name}
              </h3>
              {branch.isHeadOffice && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                  Head Office
                </span>
              )}
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {branch.employees.length} Employees
              </span>
            </div>
            
            {/* Address */}
            {(branch.address || branch.city || branch.state) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {branch.address && <span>{branch.address},</span>}
                {branch.city && <span>{branch.city},</span>}
                {branch.state && <span>{branch.state}</span>}
              </p>
            )}
          </div>

          {/* Branch Head (Manager) info */}
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/20 max-w-xs border-zinc-100 dark:border-zinc-800/80">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0 text-xs">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Branch Head</p>
              <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                {branch.branchHead ? `${branch.branchHead.firstName} ${branch.branchHead.lastName ?? ""}` : "Unassigned"}
              </p>
              {branch.branchHead?.designation && (
                <p className="text-[10px] text-zinc-500 truncate">{branch.branchHead.designation}</p>
              )}
            </div>
          </div>
        </div>

        {/* Expand employees toggle */}
        {hasEmployees && (
          <div className="flex justify-end pt-3 border-t mt-4 border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer"
            >
              {isExpanded ? (
                <>Hide Branch Directory <ChevronDown className="h-3.5 w-3.5" /></>
              ) : (
                <>Show Branch Directory <ChevronRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Directory listing of employees in the branch */}
      {isExpanded && hasEmployees && (
        <div className="ml-6 pl-4 border-l border-zinc-200 dark:border-zinc-800 grid gap-2 sm:grid-cols-2">
          {branch.employees.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-850 bg-zinc-50/20 dark:bg-zinc-950/10 text-xs hover:border-primary/25 transition-all duration-200"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border">
                  <User className="h-4.5 w-4.5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {emp.firstName} {emp.lastName ?? ""}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {emp.designation || "Staff Member"}
                  </p>
                </div>
              </div>

              {/* Contacts */}
              <div className="flex flex-col items-end gap-1 text-[9px] text-zinc-400 font-medium">
                {emp.email && <span className="truncate max-w-[120px]">{emp.email}</span>}
                {emp.phone && <span>{emp.phone}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
