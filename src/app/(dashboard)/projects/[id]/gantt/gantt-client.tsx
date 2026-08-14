"use client";

import { useMemo, useState, useRef } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Diamond,
  Layers,
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GanttTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string | null;
  parentId: string | null;
  milestoneId?: string | null;
  subtasks?: GanttTask[];
}

interface GanttMilestone {
  id: string;
  title: string;
  dueDate: string | null;
  isCompleted: boolean;
}

interface GanttData {
  project: { id: string; name: string };
  tasks: GanttTask[];
  milestones: GanttMilestone[];
  projectStart: string;
  projectEnd: string;
}

export interface HierarchyRow {
  id: string;
  rowNum: number;
  wbs: string;
  name: string;
  type: "project" | "milestone" | "task" | "unassigned";
  indent: number;
  durationDays: number;
  startDate: Date;
  endDate: Date;
  status?: string;
  priority?: string;
  isCompleted?: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  parentId?: string | null;
  milestoneId?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  TODO: "#94a3b8", // Slate
  IN_PROGRESS: "#3b82f6", // Blue
  IN_REVIEW: "#eab308", // Yellow
  DONE: "#22c55e", // Green
  BLOCKED: "#ef4444", // Red
};

const TASK_BAR_CLASSES: Record<string, string> = {
  TODO: "bg-slate-400 border-slate-600 text-slate-900",
  IN_PROGRESS: "bg-blue-500 border-blue-700 text-white",
  IN_REVIEW: "bg-amber-400 border-amber-600 text-slate-900",
  DONE: "bg-emerald-500 border-emerald-700 text-white",
  BLOCKED: "bg-red-500 border-red-700 text-white",
};

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / msPerDay) + 1);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function startOfWeek(d: Date): Date {
  const result = new Date(d);
  result.setDate(result.getDate() - result.getDay() + 1); // Monday
  result.setHours(0, 0, 0, 0);
  return result;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GanttClient({ data }: { data: GanttData }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Expanded state for collapsible nodes (default: all expanded)
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    next["root-project"] = false;
    for (const m of data.milestones) next[`m-${m.id}`] = true;
    next["unassigned-group"] = true;
    setCollapsedMap(next);
  };

  const expandAll = () => {
    setCollapsedMap({});
  };

  // Build Hierarchical Rows Tree
  const { flatRows, timelineStart, totalDays, weeks, dayWidth } = useMemo(() => {
    const dw = 32; // pixels per day

    // 1. Organize tasks by milestone
    const milestoneTasksMap = new Map<string, GanttTask[]>();
    const unassignedTasks: GanttTask[] = [];

    for (const task of data.tasks) {
      if (task.milestoneId) {
        const existing = milestoneTasksMap.get(task.milestoneId) || [];
        existing.push(task);
        milestoneTasksMap.set(task.milestoneId, existing);
      } else if (task.parentId) {
        // Find if parent belongs to a milestone
        const parentTask = data.tasks.find((t) => t.id === task.parentId);
        if (parentTask?.milestoneId) {
          const existing = milestoneTasksMap.get(parentTask.milestoneId) || [];
          existing.push(task);
          milestoneTasksMap.set(parentTask.milestoneId, existing);
        } else {
          unassignedTasks.push(task);
        }
      } else {
        unassignedTasks.push(task);
      }
    }

    // Helper to calculate date range for a list of tasks/milestones
    const getDateRange = (
      taskList: GanttTask[],
      fallbackDueDate?: string | null
    ): { start: Date; end: Date } => {
      const dates: Date[] = [];
      if (fallbackDueDate) dates.push(new Date(fallbackDueDate));

      for (const t of taskList) {
        dates.push(new Date(t.startDate));
        if (t.endDate) dates.push(new Date(t.endDate));
        if (t.subtasks) {
          for (const st of t.subtasks) {
            dates.push(new Date(st.startDate));
            if (st.endDate) dates.push(new Date(st.endDate));
          }
        }
      }

      if (dates.length === 0) {
        const today = new Date();
        return { start: today, end: new Date(today.getTime() + 86400000 * 5) };
      }

      const timestamps = dates.map((d) => d.getTime());
      return {
        start: new Date(Math.min(...timestamps)),
        end: new Date(Math.max(...timestamps)),
      };
    };

    // Calculate Project Date Range
    const { start: rawProjStart, end: rawProjEnd } = getDateRange(
      data.tasks,
      data.projectStart
    );

    const rows: HierarchyRow[] = [];
    let rowCounter = 1;

    // --- LEVEL 0: ROOT PROJECT ---
    const isRootCollapsed = !!collapsedMap["root-project"];
    const rootRow: HierarchyRow = {
      id: "root-project",
      rowNum: rowCounter++,
      wbs: "",
      name: data.project.name,
      type: "project",
      indent: 0,
      durationDays: daysBetween(rawProjStart, rawProjEnd),
      startDate: rawProjStart,
      endDate: rawProjEnd,
      hasChildren: true,
      isExpanded: !isRootCollapsed,
    };
    rows.push(rootRow);

    if (!isRootCollapsed) {
      let mIndex = 1;

      // --- LEVEL 1: MILESTONES ---
      for (const ms of data.milestones) {
        const msId = `m-${ms.id}`;
        const linkedTasks = milestoneTasksMap.get(ms.id) || [];
        const { start: msStart, end: msEnd } = getDateRange(
          linkedTasks,
          ms.dueDate
        );
        const isMsCollapsed = !!collapsedMap[msId];

        const milestoneRow: HierarchyRow = {
          id: msId,
          rowNum: rowCounter++,
          wbs: `${mIndex}`,
          name: ms.title,
          type: "milestone",
          indent: 1,
          durationDays: daysBetween(msStart, msEnd),
          startDate: msStart,
          endDate: msEnd,
          isCompleted: ms.isCompleted,
          hasChildren: linkedTasks.length > 0,
          isExpanded: !isMsCollapsed,
          milestoneId: ms.id,
        };
        rows.push(milestoneRow);

        // --- LEVEL 2: TASKS UNDER MILESTONE ---
        if (!isMsCollapsed && linkedTasks.length > 0) {
          let tIndex = 1;
          for (const task of linkedTasks) {
            const tStart = new Date(task.startDate);
            const tEnd = task.endDate
              ? new Date(task.endDate)
              : new Date(tStart.getTime() + 86400000 * 3);

            const taskRow: HierarchyRow = {
              id: task.id,
              rowNum: rowCounter++,
              wbs: `${mIndex}.${tIndex}`,
              name: task.title,
              type: "task",
              indent: 2,
              durationDays: daysBetween(tStart, tEnd),
              startDate: tStart,
              endDate: tEnd,
              status: task.status,
              priority: task.priority,
              hasChildren: (task.subtasks?.length ?? 0) > 0,
              isExpanded: true,
              milestoneId: ms.id,
            };
            rows.push(taskRow);

            // Subtasks (Level 3)
            if (task.subtasks && task.subtasks.length > 0) {
              let stIndex = 1;
              for (const st of task.subtasks) {
                const stStart = new Date(st.startDate);
                const stEnd = st.endDate
                  ? new Date(st.endDate)
                  : new Date(stStart.getTime() + 86400000 * 2);

                rows.push({
                  id: st.id,
                  rowNum: rowCounter++,
                  wbs: `${mIndex}.${tIndex}.${stIndex}`,
                  name: st.title,
                  type: "task",
                  indent: 3,
                  durationDays: daysBetween(stStart, stEnd),
                  startDate: stStart,
                  endDate: stEnd,
                  status: st.status,
                  priority: st.priority,
                  hasChildren: false,
                  isExpanded: true,
                  parentId: task.id,
                  milestoneId: ms.id,
                });
                stIndex++;
              }
            }
            tIndex++;
          }
        }
        mIndex++;
      }

      // --- GENERAL / UNASSIGNED TASKS GROUP ---
      if (unassignedTasks.length > 0) {
        const unassignedId = "unassigned-group";
        const { start: uStart, end: uEnd } = getDateRange(unassignedTasks);
        const isUnassignedCollapsed = !!collapsedMap[unassignedId];

        rows.push({
          id: unassignedId,
          rowNum: rowCounter++,
          wbs: `${mIndex}`,
          name: "General Tasks",
          type: "unassigned",
          indent: 1,
          durationDays: daysBetween(uStart, uEnd),
          startDate: uStart,
          endDate: uEnd,
          hasChildren: true,
          isExpanded: !isUnassignedCollapsed,
        });

        if (!isUnassignedCollapsed) {
          let uTaskIdx = 1;
          for (const task of unassignedTasks) {
            const tStart = new Date(task.startDate);
            const tEnd = task.endDate
              ? new Date(task.endDate)
              : new Date(tStart.getTime() + 86400000 * 3);

            rows.push({
              id: task.id,
              rowNum: rowCounter++,
              wbs: `${mIndex}.${uTaskIdx}`,
              name: task.title,
              type: "task",
              indent: 2,
              durationDays: daysBetween(tStart, tEnd),
              startDate: tStart,
              endDate: tEnd,
              status: task.status,
              priority: task.priority,
              hasChildren: false,
              isExpanded: true,
            });
            uTaskIdx++;
          }
        }
      }
    }

    // Determine Timeline Start & End with Padding
    const tStart = startOfWeek(rawProjStart);
    const tEnd = new Date(rawProjEnd);
    const daysToSunday = 7 - tEnd.getDay();
    if (daysToSunday < 7) tEnd.setDate(tEnd.getDate() + daysToSunday);

    const totalD = daysBetween(tStart, tEnd);

    // Build Weeks Array for Gantt Header
    const wks: { label: string; days: number; startDay: number }[] = [];
    const cursor = new Date(tStart);
    let dayOffset = 0;
    while (dayOffset < totalD) {
      const daysInWeek = Math.min(7, totalD - dayOffset);
      const label = cursor.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      wks.push({ label, days: daysInWeek, startDay: dayOffset });
      dayOffset += daysInWeek;
      cursor.setDate(cursor.getDate() + 7);
    }

    return {
      flatRows: rows,
      timelineStart: tStart,
      totalDays: totalD,
      weeks: wks,
      dayWidth: dw,
    };
  }, [data, collapsedMap]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = daysBetween(timelineStart, today) - 1;

  const timelineWidth = Math.max(totalDays * dayWidth, 800);
  const rowHeight = 38;

  return (
    <div className="space-y-4 font-sans text-slate-800 dark:text-slate-200">
      {/* Top Controls & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${data.project.id}`}>
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <ArrowLeft className="h-4 w-4" /> Back to Project
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {data.project.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Hierarchical Gantt Chart View • {flatRows.length} items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs gap-1">
            <Maximize2 className="h-3.5 w-3.5" /> Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs gap-1">
            <Minimize2 className="h-3.5 w-3.5" /> Collapse All
          </Button>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs bg-muted/30 px-3 py-2 rounded-lg border">
        <span className="font-medium text-slate-700 dark:text-slate-300 mr-2">Legend:</span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="inline-block h-3 w-6 bg-slate-800 rounded-sm" /> Project Summary
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="inline-block h-3 w-6 bg-blue-700 rounded-sm" /> Milestone Group
        </span>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-4 rounded-sm" style={{ backgroundColor: color }} />
            {status.replace("_", " ")}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-0.5 bg-red-500" /> Today Line
        </span>
      </div>

      {/* Main Gantt Split Container */}
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="flex overflow-x-auto relative">
          {/* LEFT TABLE: MS Project Style Task Sheet */}
          <div className="shrink-0 border-r bg-card z-20 shadow-md sticky left-0 w-[500px]">
            {/* Header Row */}
            <div className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 border-b bg-slate-100 dark:bg-slate-800/80 h-[38px] px-2 divide-x">
              <div className="w-8 text-center shrink-0">#</div>
              <div className="flex-1 px-2 truncate">Task / Milestone Name</div>
              <div className="w-20 text-center shrink-0">Duration</div>
              <div className="w-24 text-center shrink-0">Start</div>
              <div className="w-24 text-center shrink-0">End</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y">
              {flatRows.map((row, idx) => {
                const isProject = row.type === "project";
                const isMilestone = row.type === "milestone" || row.type === "unassigned";

                return (
                  <div
                    key={row.id}
                    className={`flex items-center text-xs h-[38px] px-2 divide-x hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                      isProject
                        ? "bg-slate-200/70 dark:bg-slate-800 font-bold"
                        : isMilestone
                          ? "bg-slate-100/70 dark:bg-slate-900/60 font-semibold"
                          : idx % 2 === 0
                            ? "bg-white dark:bg-slate-950"
                            : "bg-slate-50/50 dark:bg-slate-900/30"
                    }`}
                  >
                    {/* Index */}
                    <div className="w-8 text-center text-slate-500 text-[11px] shrink-0">
                      {row.rowNum}
                    </div>

                    {/* Task / Milestone Name with Hierarchy fold button */}
                    <div
                      className="flex-1 px-2 flex items-center gap-1.5 truncate"
                      style={{ paddingLeft: `${8 + row.indent * 16}px` }}
                      title={row.name}
                    >
                      {row.hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleCollapse(row.id)}
                          className="p-0.5 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
                        >
                          {row.isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}

                      {isProject && <Layers className="h-3.5 w-3.5 text-slate-800 dark:text-slate-200 shrink-0" />}
                      {isMilestone && <Diamond className="h-3 w-3 text-blue-600 fill-blue-600 shrink-0" />}

                      {row.wbs && <span className="text-[11px] font-mono text-muted-foreground shrink-0">{row.wbs}</span>}
                      <span className="truncate whitespace-nowrap">{row.name}</span>

                      {row.isCompleted && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 ml-1" />
                      )}
                    </div>

                    {/* Duration */}
                    <div className="w-20 text-center text-slate-600 dark:text-slate-400 shrink-0 text-[11px]">
                      {row.durationDays} {row.durationDays === 1 ? "day" : "days"}
                    </div>

                    {/* Start Date */}
                    <div className="w-24 text-center text-slate-600 dark:text-slate-400 shrink-0 text-[11px]">
                      {formatDate(row.startDate)}
                    </div>

                    {/* End Date */}
                    <div className="w-24 text-center text-slate-600 dark:text-slate-400 shrink-0 text-[11px]">
                      {formatDate(row.endDate)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT TIMELINE: Gantt Timeline Bars */}
          <div ref={scrollRef} className="overflow-x-auto flex-1 bg-slate-50/30 dark:bg-slate-950">
            <div style={{ width: timelineWidth }}>
              {/* Timeline Header (Weeks & Days) */}
              <div className="flex border-b bg-slate-100 dark:bg-slate-800/80 h-[38px] text-[11px] font-semibold text-slate-600 dark:text-slate-400 select-none">
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center border-r border-slate-300 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-800/50"
                    style={{ width: w.days * dayWidth }}
                  >
                    {w.label}
                  </div>
                ))}
              </div>

              {/* Timeline Rows */}
              <div className="relative divide-y">
                {/* Vertical Week Gridlines */}
                {weeks.map((w, wi) => (
                  <div
                    key={wi}
                    className="absolute top-0 bottom-0 border-r border-dashed border-slate-200 dark:border-slate-800 pointer-events-none"
                    style={{ left: (w.startDay + w.days) * dayWidth }}
                  />
                ))}

                {/* Today Line */}
                {todayOffset >= 0 && todayOffset <= totalDays && (
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-30"
                    style={{
                      left: todayOffset * dayWidth + dayWidth / 2,
                      width: 2,
                      backgroundColor: "#ef4444",
                    }}
                  >
                    <div className="absolute -top-0 -left-3 text-[9px] font-bold text-white bg-red-500 rounded px-1 shadow-sm">
                      Today
                    </div>
                  </div>
                )}

                {/* Render Bar Rows */}
                {flatRows.map((row, idx) => {
                  const isProject = row.type === "project";
                  const isMilestoneGroup = row.type === "milestone" || row.type === "unassigned";

                  const startDayOffset = daysBetween(timelineStart, row.startDate) - 1;
                  const durationInDays = row.durationDays;
                  const barLeft = startDayOffset * dayWidth;
                  const barWidth = Math.max(durationInDays * dayWidth, 16);

                  return (
                    <div
                      key={row.id}
                      className={`relative h-[38px] border-b ${
                        isProject
                          ? "bg-slate-200/40 dark:bg-slate-800/40"
                          : isMilestoneGroup
                            ? "bg-slate-100/40 dark:bg-slate-900/30"
                            : idx % 2 === 0
                              ? "transparent"
                              : "bg-slate-100/20 dark:bg-slate-900/20"
                      }`}
                    >
                      {/* LEVEL 0: Project Bracket Summary Bar */}
                      {isProject && (
                        <div
                          className="absolute h-3.5 bg-slate-900 dark:bg-slate-100 rounded-sm top-3 z-10 flex items-center shadow-sm"
                          style={{ left: barLeft, width: barWidth }}
                          title={`Project: ${row.name}\n${formatDate(row.startDate)} - ${formatDate(row.endDate)}`}
                        >
                          {/* Left Bracket End */}
                          <div className="w-1.5 h-4 bg-slate-900 dark:bg-slate-100 absolute -left-0.5 top-0 rounded-l-sm" />
                          {/* Right Bracket End */}
                          <div className="w-1.5 h-4 bg-slate-900 dark:bg-slate-100 absolute -right-0.5 top-0 rounded-r-sm" />
                        </div>
                      )}

                      {/* LEVEL 1: Milestone Bracket Summary Bar */}
                      {isMilestoneGroup && (
                        <div
                          className="absolute h-3 bg-blue-700 dark:bg-blue-500 rounded-sm top-3.5 z-10 shadow-sm"
                          style={{ left: barLeft, width: barWidth }}
                          title={`Milestone Group: ${row.name}\n${formatDate(row.startDate)} - ${formatDate(row.endDate)}`}
                        >
                          {/* Downward bracket ends */}
                          <div className="w-1 h-3.5 bg-blue-900 dark:bg-blue-400 absolute left-0 top-0" />
                          <div className="w-1 h-3.5 bg-blue-900 dark:bg-blue-400 absolute right-0 top-0" />
                        </div>
                      )}

                      {/* LEVEL 2: Task Bar */}
                      {!isProject && !isMilestoneGroup && (
                        <div
                          className={`absolute h-6 top-1.5 rounded-md border flex items-center px-2 text-[11px] font-medium shadow-sm transition-transform hover:scale-[1.01] cursor-pointer group z-10 ${
                            TASK_BAR_CLASSES[row.status || "TODO"] || "bg-blue-500 text-white"
                          }`}
                          style={{ left: barLeft, width: barWidth }}
                          title={`${row.name}\nDuration: ${row.durationDays} days\n${formatDate(row.startDate)} - ${formatDate(row.endDate)}\nStatus: ${row.status || "TODO"}`}
                        >
                          <span className="truncate drop-shadow-sm">
                            {barWidth > 60 ? row.name : ""}
                          </span>

                          {/* Hover Tooltip */}
                          <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 p-2 bg-slate-900 text-white border rounded shadow-xl text-xs whitespace-nowrap z-50 pointer-events-none">
                            <div className="font-bold">{row.name}</div>
                            <div className="text-[11px] text-slate-300">
                              {formatDate(row.startDate)} — {formatDate(row.endDate)} ({row.durationDays} days)
                            </div>
                            <div className="text-[11px] text-blue-300">Status: {row.status || "TODO"}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
