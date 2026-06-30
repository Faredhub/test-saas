"use client";

import { useState, useMemo } from "react";
import { MessageSquare, Phone, Video, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrgEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  designation: string | null;
  status: string;
  reportingToId: string | null;
  avatar: string | null;
}

interface OrgChartProps {
  employees: OrgEmployee[];
  selectedEmployeeId?: string | null;
  onSelectEmployee: (emp: OrgEmployee) => void;
}

interface TreeNode extends OrgEmployee {
  children: TreeNode[];
}

export function OrgChart({ employees, selectedEmployeeId, onSelectEmployee }: OrgChartProps) {
  // Build the hierarchical tree structure
  const { roots } = useMemo(() => {
    const employeeMap = new Map<string, TreeNode>();
    
    // Initialize map with empty children arrays
    employees.forEach((emp) => {
      employeeMap.set(emp.id, { ...emp, children: [] });
    });

    const roots: TreeNode[] = [];

    // Build the parent-child relationships
    employeeMap.forEach((node) => {
      const parentId = node.reportingToId;
      if (parentId && employeeMap.has(parentId)) {
        employeeMap.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return { roots };
  }, [employees]);

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg bg-zinc-50/55 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800">
        <User className="h-10 w-10 text-muted-foreground opacity-50 mb-3" />
        <h3 className="text-sm font-semibold">No Hierarchy Available</h3>
        <p className="text-xs text-muted-foreground mt-1">No employees found in this view.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto py-8 px-4 flex justify-center bg-zinc-50/30 dark:bg-zinc-950/5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/40">
      <div className="min-w-max flex justify-center gap-12">
        {roots.map((root) => (
          <OrgChartNode
            key={root.id}
            node={root}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={onSelectEmployee}
          />
        ))}
      </div>
    </div>
  );
}

interface OrgChartNodeProps {
  node: TreeNode;
  selectedEmployeeId?: string | null;
  onSelectEmployee: (emp: OrgEmployee) => void;
}

function OrgChartNode({ node, selectedEmployeeId, onSelectEmployee }: OrgChartNodeProps) {
  const isSelected = selectedEmployeeId === node.id;
  const hasChildren = node.children.length > 0;

  // Generate status badge color
  const statusBorderColor = 
    node.status === "ACTIVE" 
      ? "border-emerald-500 shadow-emerald-100/50 dark:shadow-emerald-950/30" 
      : node.status === "ON_NOTICE"
      ? "border-amber-500 shadow-amber-100/50 dark:shadow-amber-950/30"
      : "border-zinc-400 shadow-zinc-100/50 dark:shadow-zinc-950/30";

  return (
    <div className="flex flex-col items-center select-none">
      {/* Node Container */}
      <div
        onClick={() => onSelectEmployee(node)}
        className={cn(
          "relative flex flex-col items-center w-52 p-4 pt-8 rounded-2xl border bg-white dark:bg-zinc-900/90 shadow-sm cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md group",
          isSelected 
            ? "border-primary ring-2 ring-primary/20 dark:ring-primary/40 shadow-primary/10" 
            : "border-zinc-200/80 dark:border-zinc-800/80"
        )}
      >
        {/* Profile Image Circle at Top Center */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2">
          <div className={cn(
            "h-14 w-14 rounded-full border-2 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shadow-sm transition-transform duration-300 group-hover:scale-105",
            statusBorderColor
          )}>
            {node.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={node.avatar}
                alt={node.firstName}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
            )}
          </div>
          {/* Active status pulse badge */}
          {node.status === "ACTIVE" && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border border-white dark:border-zinc-900 animate-pulse" />
          )}
        </div>

        {/* Info */}
        <div className="text-center w-full mt-2">
          <h4 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
            {node.firstName} {node.lastName}
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate font-medium">
            {node.designation || "Staff Member"}
          </p>
        </div>

        {/* Action icons below - Message, Call, Video Call */}
        <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 w-full opacity-60 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              alert(`Chat message initiated with ${node.firstName}`);
            }}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-primary rounded-lg transition-colors text-zinc-500 dark:text-zinc-400 hover:scale-110 active:scale-95"
            title="Send Message"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              alert(`Voice call started with ${node.phone || node.firstName}`);
            }}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-primary rounded-lg transition-colors text-zinc-500 dark:text-zinc-400 hover:scale-110 active:scale-95"
            title="Call"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              alert(`Video call started with ${node.firstName}`);
            }}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-primary rounded-lg transition-colors text-zinc-500 dark:text-zinc-400 hover:scale-110 active:scale-95"
            title="Video Call"
          >
            <Video className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Down Connector Line (from node to horizontal bridge or direct child) */}
      {hasChildren && (
        <div className="h-8 w-px bg-zinc-300 dark:bg-zinc-700"></div>
      )}

      {/* Render child nodes horizontally */}
      {hasChildren && (
        <div className="flex gap-10 relative pt-4">
          {/* Horizontal connecting bridge spanning across sibling nodes */}
          {node.children.length > 1 && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-zinc-300 dark:bg-zinc-700 w-[calc(100%-13rem)]"></div>
          )}
          {node.children.map((child) => (
            <div key={child.id} className="relative">
              {/* Connector line down to child node from the horizontal bridge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
              <OrgChartNode
                node={child}
                selectedEmployeeId={selectedEmployeeId}
                onSelectEmployee={onSelectEmployee}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
