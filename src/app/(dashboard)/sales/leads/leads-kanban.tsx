"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Flame, Building2, DollarSign, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

type Lead = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
  source: string;
  pipelineStage: string;
  score: number;
  estimatedValue?: unknown;
};

type LeadsKanbanProps = {
  leads: Lead[];
  onStageChange: (id: string, stage: string) => void;
};

const STAGES = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;

const STAGE_CONFIG: Record<string, { label: string; borderColor: string; bgColor: string; badgeBg: string }> = {
  NEW:          { label: "New",          borderColor: "border-t-blue-500",   bgColor: "bg-blue-50 dark:bg-blue-950/30",     badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  QUALIFIED:    { label: "Qualified",    borderColor: "border-t-cyan-500",   bgColor: "bg-cyan-50 dark:bg-cyan-950/30",     badgeBg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
  PROPOSAL:     { label: "Proposal",     borderColor: "border-t-purple-500", bgColor: "bg-purple-50 dark:bg-purple-950/30", badgeBg: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  NEGOTIATION:  { label: "Negotiation",  borderColor: "border-t-amber-500",  bgColor: "bg-amber-50 dark:bg-amber-950/30",   badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  WON:          { label: "Won",          borderColor: "border-t-green-500",  bgColor: "bg-green-50 dark:bg-green-950/30",   badgeBg: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  LOST:         { label: "Lost",         borderColor: "border-t-red-500",    bgColor: "bg-red-50 dark:bg-red-950/30",       badgeBg: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

function getScoreColor(score: number): string {
  if (score >= 76) return "text-red-500";
  if (score >= 51) return "text-orange-500";
  if (score >= 26) return "text-yellow-500";
  return "text-blue-500";
}

function getScoreBadge(score: number): { label: string; className: string } {
  if (score >= 76) return { label: "Very Hot", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" };
  if (score >= 51) return { label: "Hot", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" };
  if (score >= 26) return { label: "Warm", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" };
  return { label: "Cold", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" };
}

function formatValue(value: unknown): string | null {
  if (value == null) return null;
  const num = typeof value === "object" && value !== null && "toNumber" in (value as Record<string, unknown>)
    ? (value as { toNumber: () => number }).toNumber()
    : Number(value);
  if (isNaN(num) || num === 0) return null;
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

function LeadCard({ lead, onDragStart }: { lead: Lead; onDragStart: (e: React.DragEvent, leadId: string) => void }) {
  const scoreBadge = getScoreBadge(lead.score);
  const value = formatValue(lead.estimatedValue);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="group cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing active:shadow-lg active:scale-[1.02] active:opacity-90"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">
          {lead.firstName} {lead.lastName}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Flame className={cn("h-3.5 w-3.5", getScoreColor(lead.score))} />
          <span className="text-xs font-medium tabular-nums">{lead.score}</span>
        </div>
      </div>

      {lead.company && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{lead.company}</span>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge className={cn("border-0 px-1.5 py-0 text-[10px] leading-4 font-medium", scoreBadge.className)}>
          {scoreBadge.label}
        </Badge>
        {value && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0 text-[10px] font-medium leading-4 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            <DollarSign className="h-2.5 w-2.5" />
            {value.replace("$", "")}
          </span>
        )}
        <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0 text-[10px] font-medium leading-4 text-muted-foreground">
          <Megaphone className="h-2.5 w-2.5" />
          {lead.source.replace("_", " ")}
        </span>
      </div>
    </div>
  );
}

export function LeadsKanban({ leads, onStageChange }: LeadsKanbanProps) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const groupedLeads = STAGES.reduce<Record<string, Lead[]>>((acc, stage) => {
    acc[stage] = leads.filter((l) => l.pipelineStage === stage);
    return acc;
  }, {} as Record<string, Lead[]>);

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedLeadId(leadId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're leaving the column, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStage(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, newStage: string) => {
      e.preventDefault();
      const leadId = e.dataTransfer.getData("text/plain");
      setDragOverStage(null);
      setDraggedLeadId(null);
      if (leadId) {
        const lead = leads.find((l) => l.id === leadId);
        if (lead && lead.pipelineStage !== newStage) {
          onStageChange(leadId, newStage);
        }
      }
    },
    [leads, onStageChange]
  );

  const handleDragEnd = useCallback(() => {
    setDragOverStage(null);
    setDraggedLeadId(null);
  }, []);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" onDragEnd={handleDragEnd}>
      {STAGES.map((stage) => {
        const config = STAGE_CONFIG[stage];
        const stageLeads = groupedLeads[stage] ?? [];
        const isOver = dragOverStage === stage;

        return (
          <div
            key={stage}
            className={cn(
              "flex w-[280px] min-w-[280px] flex-col rounded-lg border-t-4 bg-muted/30 transition-colors",
              config.borderColor,
              isOver && "ring-2 ring-primary/30 bg-primary/5"
            )}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage)}
          >
            {/* Column Header */}
            <div className={cn("flex items-center justify-between rounded-t-lg px-3 py-2.5", config.bgColor)}>
              <h3 className="text-sm font-semibold tracking-wide">{config.label}</h3>
              <Badge variant="secondary" className={cn("border-0 text-xs font-bold tabular-nums", config.badgeBg)}>
                {stageLeads.length}
              </Badge>
            </div>

            {/* Cards Container */}
            <div className="flex flex-1 flex-col gap-2 p-2 min-h-[120px]">
              {stageLeads.length === 0 ? (
                <div
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-md border-2 border-dashed p-4 text-xs text-muted-foreground transition-colors",
                    isOver && "border-primary/40 bg-primary/5 text-primary"
                  )}
                >
                  {isOver ? "Drop here" : "No leads"}
                </div>
              ) : (
                stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={cn(
                      "transition-opacity",
                      draggedLeadId === lead.id && "opacity-40"
                    )}
                  >
                    <LeadCard lead={lead} onDragStart={handleDragStart} />
                  </div>
                ))
              )}
              {stageLeads.length > 0 && isOver && (
                <div className="rounded-md border-2 border-dashed border-primary/40 bg-primary/5 p-3 text-center text-xs text-primary">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
