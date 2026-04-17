"use client";

import { useMemo, useRef } from "react";
import { ArrowLeft, Diamond } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#eab308",
  DONE: "#22c55e",
};

const STATUS_BG: Record<string, string> = {
  TODO: "#f1f5f9",
  IN_PROGRESS: "#dbeafe",
  IN_REVIEW: "#fef9c3",
  DONE: "#dcfce7",
};

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
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

  const { weeks, totalDays, timelineStart, dayWidth, flatRows } =
    useMemo(() => {
      const tStart = startOfWeek(new Date(data.projectStart));
      const tEnd = new Date(data.projectEnd);
      // Extend to end of the last week
      const daysToSunday = 7 - tEnd.getDay();
      if (daysToSunday < 7) tEnd.setDate(tEnd.getDate() + daysToSunday);

      const total = daysBetween(tStart, tEnd);
      const dw = 28; // pixels per day

      // Build weeks array
      const wks: { label: string; days: number; startDay: number }[] = [];
      let cursor = new Date(tStart);
      let dayOffset = 0;
      while (dayOffset < total) {
        const weekEnd = new Date(cursor);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const label = cursor.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const daysInWeek = Math.min(7, total - dayOffset);
        wks.push({ label, days: daysInWeek, startDay: dayOffset });
        dayOffset += daysInWeek;
        cursor.setDate(cursor.getDate() + 7);
      }

      // Flatten tasks with subtasks
      const rows: { task: GanttTask; indent: number }[] = [];
      for (const task of data.tasks) {
        rows.push({ task, indent: 0 });
        if (task.subtasks) {
          for (const sub of task.subtasks) {
            rows.push({ task: sub, indent: 1 });
          }
        }
      }

      return {
        weeks: wks,
        totalDays: total,
        timelineStart: tStart,
        dayWidth: dw,
        flatRows: rows,
      };
    }, [data]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = daysBetween(timelineStart, today);

  const timelineWidth = totalDays * dayWidth;
  const labelColWidth = 260;
  const rowHeight = 44;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/projects/${data.project.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">{data.project.name} - Gantt Chart</h1>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground px-1">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-6 rounded-sm"
              style={{ backgroundColor: color }}
            />
            {status.replace("_", " ")}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <Diamond className="h-3 w-3 text-purple-500 fill-purple-500" />
          Milestone
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 bg-red-500" />
          Today
        </span>
      </div>

      {/* Gantt container */}
      <div
        className="border rounded-lg bg-card overflow-hidden"
        style={{ position: "relative" }}
      >
        <div className="flex">
          {/* Left: task labels (fixed) */}
          <div
            className="shrink-0 border-r bg-card z-10"
            style={{ width: labelColWidth, position: "sticky", left: 0 }}
          >
            {/* Header row */}
            <div
              className="flex items-center px-3 font-medium text-sm border-b bg-muted/50"
              style={{ height: rowHeight }}
            >
              Task
            </div>

            {/* Task rows */}
            {flatRows.map(({ task, indent }, i) => (
              <div
                key={task.id}
                className="flex items-center px-3 text-sm border-b truncate"
                style={{
                  height: rowHeight,
                  paddingLeft: 12 + indent * 20,
                  backgroundColor: i % 2 === 0 ? "transparent" : "var(--muted-5, rgba(0,0,0,0.02))",
                }}
                title={task.title}
              >
                {indent > 0 && (
                  <span className="text-muted-foreground mr-1.5 text-xs">&#x2514;</span>
                )}
                <span className="truncate">{task.title}</span>
              </div>
            ))}

            {/* Milestone rows */}
            {data.milestones.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center px-3 text-sm border-b truncate italic text-purple-700 dark:text-purple-400"
                style={{
                  height: rowHeight,
                  backgroundColor:
                    (flatRows.length + i) % 2 === 0
                      ? "transparent"
                      : "var(--muted-5, rgba(0,0,0,0.02))",
                }}
                title={m.title}
              >
                <Diamond className="mr-1.5 h-3 w-3 shrink-0" />
                <span className="truncate">{m.title}</span>
              </div>
            ))}
          </div>

          {/* Right: scrollable timeline */}
          <div
            ref={scrollRef}
            className="overflow-x-auto flex-1"
            style={{ position: "relative" }}
          >
            <div style={{ width: timelineWidth, minWidth: "100%" }}>
              {/* Week headers */}
              <div
                className="flex border-b bg-muted/50"
                style={{ height: rowHeight }}
              >
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-xs font-medium border-r text-muted-foreground"
                    style={{ width: w.days * dayWidth }}
                  >
                    {w.label}
                  </div>
                ))}
              </div>

              {/* Task bars */}
              {flatRows.map(({ task }, i) => {
                const taskStart = new Date(task.startDate);
                const taskEnd = task.endDate
                  ? new Date(task.endDate)
                  : new Date(taskStart.getTime() + 86400000 * 3); // default 3-day bar

                const startDay = daysBetween(timelineStart, taskStart);
                const duration = Math.max(daysBetween(taskStart, taskEnd), 1);
                const color = STATUS_COLORS[task.status] ?? "#94a3b8";
                const bgColor = STATUS_BG[task.status] ?? "#f1f5f9";

                return (
                  <div
                    key={task.id}
                    className="relative border-b"
                    style={{
                      height: rowHeight,
                      backgroundColor:
                        i % 2 === 0
                          ? "transparent"
                          : "var(--muted-5, rgba(0,0,0,0.02))",
                    }}
                  >
                    {/* Vertical week gridlines */}
                    {weeks.map((w, wi) => (
                      <div
                        key={wi}
                        className="absolute top-0 bottom-0 border-r border-dashed"
                        style={{
                          left: (w.startDay + w.days) * dayWidth,
                          borderColor: "rgba(0,0,0,0.06)",
                        }}
                      />
                    ))}

                    {/* Task bar */}
                    <div
                      className="absolute rounded-md flex items-center px-1.5 text-xs font-medium cursor-default group"
                      style={{
                        left: startDay * dayWidth + 2,
                        width: Math.max(duration * dayWidth - 4, 18),
                        top: 8,
                        height: rowHeight - 16,
                        backgroundColor: bgColor,
                        borderLeft: `3px solid ${color}`,
                        color: color,
                      }}
                      title={`${task.title}\n${formatDate(task.startDate)}${task.endDate ? " - " + formatDate(task.endDate) : ""}\nStatus: ${task.status}`}
                    >
                      <span className="truncate text-[11px]">
                        {duration * dayWidth > 80 ? task.title : ""}
                      </span>

                      {/* Hover tooltip */}
                      <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 p-2 bg-popover border rounded shadow-md text-xs text-popover-foreground whitespace-nowrap z-50">
                        <div className="font-semibold">{task.title}</div>
                        <div>
                          {formatDate(task.startDate)}
                          {task.endDate ? ` - ${formatDate(task.endDate)}` : ""}
                        </div>
                        <div>Status: {task.status.replace("_", " ")}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Milestone rows */}
              {data.milestones.map((m, i) => {
                if (!m.dueDate) return (
                  <div
                    key={m.id}
                    className="relative border-b"
                    style={{
                      height: rowHeight,
                      backgroundColor:
                        (flatRows.length + i) % 2 === 0
                          ? "transparent"
                          : "var(--muted-5, rgba(0,0,0,0.02))",
                    }}
                  />
                );

                const mDate = new Date(m.dueDate);
                const mDay = daysBetween(timelineStart, mDate);

                return (
                  <div
                    key={m.id}
                    className="relative border-b"
                    style={{
                      height: rowHeight,
                      backgroundColor:
                        (flatRows.length + i) % 2 === 0
                          ? "transparent"
                          : "var(--muted-5, rgba(0,0,0,0.02))",
                    }}
                  >
                    {/* Milestone diamond */}
                    <div
                      className="absolute flex items-center justify-center group cursor-default"
                      style={{
                        left: mDay * dayWidth - 8,
                        top: rowHeight / 2 - 8,
                        width: 16,
                        height: 16,
                      }}
                      title={`${m.title}\n${formatDate(m.dueDate)}${m.isCompleted ? " (Completed)" : ""}`}
                    >
                      <Diamond
                        className={`h-4 w-4 ${
                          m.isCompleted
                            ? "text-green-500 fill-green-500"
                            : "text-purple-500 fill-purple-500"
                        }`}
                      />

                      {/* Hover tooltip */}
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 p-2 bg-popover border rounded shadow-md text-xs text-popover-foreground whitespace-nowrap z-50">
                        <div className="font-semibold">{m.title}</div>
                        <div>{formatDate(m.dueDate)}</div>
                        {m.isCompleted && (
                          <div className="text-green-600">Completed</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-20"
                  style={{
                    left: todayOffset * dayWidth,
                    width: 2,
                    backgroundColor: "#ef4444",
                  }}
                >
                  <div
                    className="absolute -top-0 -left-[11px] text-[10px] font-medium text-white bg-red-500 rounded px-1"
                  >
                    Today
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {flatRows.length === 0 && data.milestones.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          No tasks or milestones to display. Add tasks with due dates to see them on the Gantt chart.
        </div>
      )}
    </div>
  );
}
