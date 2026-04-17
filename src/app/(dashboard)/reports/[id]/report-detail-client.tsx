"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Printer,
  Pencil,
  CheckCircle2,
  Archive,
  Loader2,
  FileText,
  BarChart3,
  ImageIcon,
  PenLine,
  Type,
  TableIcon,
  Save,
} from "lucide-react";
import { updateGeneratedReport } from "@/lib/actions/reports";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Report = NonNullable<
  Awaited<ReturnType<typeof import("@/lib/actions/reports").getReportById>>
>;

type SectionDef = {
  title: string;
  type: "text" | "table" | "chart" | "image" | "signature";
  fields: { label: string; key: string }[];
};

type HeaderConfig = {
  logoUrl?: string;
  companyName?: string;
  address?: string;
};

type FooterConfig = {
  disclaimer?: string;
  signatureFields?: string[];
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  FINAL: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

const sectionIcons: Record<string, typeof Type> = {
  text: Type,
  table: TableIcon,
  chart: BarChart3,
  image: ImageIcon,
  signature: PenLine,
};

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function TextSection({
  section,
  data,
}: {
  section: SectionDef;
  data: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      {section.fields.length > 0 ? (
        section.fields.map((f) => (
          <div key={f.key}>
            {f.label && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {f.label}
              </p>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {data[f.key] || (
                <span className="text-muted-foreground italic">No content</span>
              )}
            </p>
          </div>
        ))
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {data["content"] || (
            <span className="text-muted-foreground italic">No content</span>
          )}
        </p>
      )}
    </div>
  );
}

function TableSection({
  section,
  data,
}: {
  section: SectionDef;
  data: Record<string, unknown>;
}) {
  const headers = (data["headers"] as string[]) ?? section.fields.map((f) => f.label);
  const rows = (data["rows"] as string[][]) ?? [];

  if (headers.length === 0 && rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-4">
        No table data
      </p>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => (
              <TableHead key={i}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row, rIdx) => (
              <TableRow key={rIdx}>
                {row.map((cell, cIdx) => (
                  <TableCell key={cIdx}>{cell}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className="text-center text-muted-foreground italic"
              >
                No rows
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ChartSection({
  section,
  data,
}: {
  section: SectionDef;
  data: Record<string, unknown>;
}) {
  const items = (data["items"] as { label: string; value: number }[]) ?? [];
  const chartType = (data["chartType"] as string) ?? "bar";
  const maxValue = Math.max(...items.map((i) => i.value), 1);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 border rounded-lg bg-muted/20">
        <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground italic">No chart data</p>
      </div>
    );
  }

  if (chartType === "pie") {
    const total = items.reduce((sum, i) => sum + i.value, 0);
    return (
      <div className="space-y-2">
        {items.map((item, idx) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
          const colors = [
            "bg-blue-500",
            "bg-green-500",
            "bg-amber-500",
            "bg-purple-500",
            "bg-red-500",
            "bg-cyan-500",
          ];
          return (
            <div key={idx} className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${colors[idx % colors.length]}`}
              />
              <span className="text-sm flex-1">{item.label}</span>
              <span className="text-sm font-medium">{pct}%</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Bar chart
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ImageSection({
  data,
}: {
  section: SectionDef;
  data: Record<string, string>;
}) {
  const url = data["url"] || data["src"];
  const caption = data["caption"];

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center py-8 border rounded-lg bg-muted/20">
        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground italic">No image</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={caption || "Report image"}
        className="max-w-full rounded-lg border"
      />
      {caption && (
        <p className="text-sm text-muted-foreground text-center italic">
          {caption}
        </p>
      )}
    </div>
  );
}

function SignatureSection({
  section,
  data,
}: {
  section: SectionDef;
  data: Record<string, string>;
}) {
  const sigFields =
    section.fields.length > 0
      ? section.fields.map((f) => f.label)
      : ["Signature"];

  return (
    <div className="grid grid-cols-2 gap-8 pt-4">
      {sigFields.map((label, idx) => (
        <div key={idx} className="space-y-2">
          <div className="border-b border-black pb-8">
            {data[`sig_${idx}`] && (
              <p className="text-sm italic">{data[`sig_${idx}`]}</p>
            )}
          </div>
          <p className="text-xs font-medium">{label}</p>
          {data[`date_${idx}`] && (
            <p className="text-xs text-muted-foreground">
              Date: {data[`date_${idx}`]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function RenderSection({
  section,
  data,
}: {
  section: SectionDef;
  data: Record<string, unknown>;
}) {
  const sectionData = data as Record<string, string>;
  switch (section.type) {
    case "text":
      return <TextSection section={section} data={sectionData} />;
    case "table":
      return <TableSection section={section} data={data} />;
    case "chart":
      return <ChartSection section={section} data={data} />;
    case "image":
      return <ImageSection section={section} data={sectionData} />;
    case "signature":
      return <SignatureSection section={section} data={sectionData} />;
    default:
      return <p className="text-sm text-muted-foreground">Unknown section type</p>;
  }
}

// ---------------------------------------------------------------------------
// Section data editor
// ---------------------------------------------------------------------------

function SectionEditor({
  section,
  sectionIndex,
  data,
  onUpdate,
}: {
  section: SectionDef;
  sectionIndex: number;
  data: Record<string, unknown>;
  onUpdate: (sIdx: number, data: Record<string, unknown>) => void;
}) {
  if (section.type === "text") {
    return (
      <div className="space-y-3">
        {section.fields.length > 0 ? (
          section.fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Textarea
                rows={3}
                value={(data[f.key] as string) ?? ""}
                onChange={(e) =>
                  onUpdate(sectionIndex, { ...data, [f.key]: e.target.value })
                }
              />
            </div>
          ))
        ) : (
          <div className="space-y-1">
            <Label className="text-xs">Content</Label>
            <Textarea
              rows={4}
              value={(data["content"] as string) ?? ""}
              onChange={(e) =>
                onUpdate(sectionIndex, { ...data, content: e.target.value })
              }
            />
          </div>
        )}
      </div>
    );
  }

  if (section.type === "table") {
    const headers = (data["headers"] as string[]) ?? [];
    const rows = (data["rows"] as string[][]) ?? [];
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Column Headers (comma-separated)</Label>
          <Input
            value={headers.join(", ")}
            onChange={(e) =>
              onUpdate(sectionIndex, {
                ...data,
                headers: e.target.value.split(",").map((s) => s.trim()),
              })
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Rows (one row per line, cells separated by |)
          </Label>
          <Textarea
            rows={5}
            value={rows.map((r) => r.join(" | ")).join("\n")}
            onChange={(e) =>
              onUpdate(sectionIndex, {
                ...data,
                rows: e.target.value
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((l) => l.split("|").map((c) => c.trim())),
              })
            }
          />
        </div>
      </div>
    );
  }

  if (section.type === "chart") {
    const items = (data["items"] as { label: string; value: number }[]) ?? [];
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Chart Type</Label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={(data["chartType"] as string) ?? "bar"}
            onChange={(e) =>
              onUpdate(sectionIndex, { ...data, chartType: e.target.value })
            }
          >
            <option value="bar">Bar</option>
            <option value="pie">Pie</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Data (one per line: label, value)
          </Label>
          <Textarea
            rows={5}
            value={items.map((i) => `${i.label}, ${i.value}`).join("\n")}
            onChange={(e) =>
              onUpdate(sectionIndex, {
                ...data,
                items: e.target.value
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((l) => {
                    const parts = l.split(",").map((s) => s.trim());
                    return {
                      label: parts[0] || "",
                      value: parseFloat(parts[1]) || 0,
                    };
                  }),
              })
            }
          />
        </div>
      </div>
    );
  }

  if (section.type === "image") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Image URL</Label>
          <Input
            value={(data["url"] as string) ?? ""}
            onChange={(e) =>
              onUpdate(sectionIndex, { ...data, url: e.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Caption</Label>
          <Input
            value={(data["caption"] as string) ?? ""}
            onChange={(e) =>
              onUpdate(sectionIndex, { ...data, caption: e.target.value })
            }
          />
        </div>
      </div>
    );
  }

  if (section.type === "signature") {
    const sigFields =
      section.fields.length > 0
        ? section.fields.map((f) => f.label)
        : ["Signature"];
    return (
      <div className="space-y-3">
        {sigFields.map((label, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{label} - Name</Label>
              <Input
                value={(data[`sig_${idx}`] as string) ?? ""}
                onChange={(e) =>
                  onUpdate(sectionIndex, {
                    ...data,
                    [`sig_${idx}`]: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{label} - Date</Label>
              <Input
                type="date"
                value={(data[`date_${idx}`] as string) ?? ""}
                onChange={(e) =>
                  onUpdate(sectionIndex, {
                    ...data,
                    [`date_${idx}`]: e.target.value,
                  })
                }
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type ReportDetailClientProps = {
  report: Report;
};

export function ReportDetailClient({ report }: ReportDetailClientProps) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  const template = report.template;
  const sections = (template.sections as SectionDef[] | undefined) ?? [];
  const reportData = (report.data as Record<string, Record<string, unknown>>) ?? {};
  const headerConfig = (template.headerConfig as HeaderConfig | undefined) ?? {};
  const footerConfig = (template.footerConfig as FooterConfig | undefined) ?? {};

  // Editable section data state
  const [editData, setEditData] = useState<
    Record<string, Record<string, unknown>>
  >(reportData);

  function handleSectionUpdate(
    sIdx: number,
    sectionData: Record<string, unknown>
  ) {
    setEditData((prev) => ({
      ...prev,
      [`section_${sIdx}`]: sectionData,
    }));
  }

  function handleSaveData() {
    startTransition(async () => {
      try {
        await updateGeneratedReport(report.id, { data: editData });
        toast.success("Report data saved");
        setEditOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save report"
        );
      }
    });
  }

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      try {
        await updateGeneratedReport(report.id, {
          status: newStatus as "DRAFT" | "FINAL" | "APPROVED" | "ARCHIVED",
        });
        toast.success(`Status changed to ${newStatus}`);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update status"
        );
      }
    });
  }

  function handlePrint() {
    window.print();
  }

  // Status action buttons
  const statusActions: Record<string, { label: string; status: string; icon: typeof CheckCircle2 }[]> = {
    DRAFT: [{ label: "Mark Final", status: "FINAL", icon: CheckCircle2 }],
    FINAL: [
      { label: "Approve", status: "APPROVED", icon: CheckCircle2 },
      { label: "Revert to Draft", status: "DRAFT", icon: Pencil },
    ],
    APPROVED: [{ label: "Archive", status: "ARCHIVED", icon: Archive }],
    ARCHIVED: [],
  };

  const actions = statusActions[report.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Top bar - hidden in print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{report.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[report.status]}>
                {report.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {template.name}
              </span>
              {report.clientName && (
                <span className="text-sm text-muted-foreground">
                  | {report.clientName}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {report.status === "DRAFT" && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit Data
            </Button>
          )}
          {actions.map((action) => (
            <Button
              key={action.status}
              variant="outline"
              onClick={() => handleStatusChange(action.status)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <action.icon className="mr-2 h-4 w-4" />
              )}
              {action.label}
            </Button>
          ))}
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Print-friendly report document */}
      <div
        ref={printRef}
        className="bg-white mx-auto shadow-lg print:shadow-none print:mx-0"
        style={{
          maxWidth: template.orientation === "landscape" ? "1100px" : "800px",
          padding: "48px",
        }}
      >
        {/* Report header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              {headerConfig.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={headerConfig.logoUrl}
                  alt="Logo"
                  className="h-12 mb-2"
                />
              )}
              {headerConfig.companyName && (
                <h2 className="text-xl font-bold text-gray-900">
                  {headerConfig.companyName}
                </h2>
              )}
              {headerConfig.address && (
                <p className="text-sm text-gray-600">{headerConfig.address}</p>
              )}
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold text-gray-900">{report.title}</p>
              {report.projectRef && <p>Ref: {report.projectRef}</p>}
              {report.clientName && <p>Client: {report.clientName}</p>}
              {report.location && <p>Location: {report.location}</p>}
              <p>Date: {new Date(report.generatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                This template has no sections defined.
              </p>
            </div>
          )}

          {sections.map((section, sIdx) => {
            const sectionData =
              (reportData[`section_${sIdx}`] as Record<string, unknown>) ?? {};
            const Icon = sectionIcons[section.type] ?? FileText;
            return (
              <div key={sIdx}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-gray-500 print:hidden" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {sIdx + 1}. {section.title || `Section ${sIdx + 1}`}
                  </h3>
                </div>
                <RenderSection section={section} data={sectionData} />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {(footerConfig.disclaimer || footerConfig.signatureFields?.length) && (
          <div className="mt-12 pt-6 border-t border-gray-300">
            {footerConfig.signatureFields &&
              footerConfig.signatureFields.length > 0 && (
                <div className="grid grid-cols-2 gap-8 mb-8">
                  {footerConfig.signatureFields.map((field, idx) => (
                    <div key={idx}>
                      <div className="border-b border-gray-800 pb-8 mb-2" />
                      <p className="text-xs font-medium text-gray-700">
                        {field}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Date: _______________
                      </p>
                    </div>
                  ))}
                </div>
              )}
            {footerConfig.disclaimer && (
              <p className="text-xs text-gray-500 italic leading-relaxed">
                {footerConfig.disclaimer}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Edit data dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Report Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {sections.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                This template has no sections to fill in.
              </p>
            )}
            {sections.map((section, sIdx) => {
              const sectionData =
                (editData[`section_${sIdx}`] as Record<string, unknown>) ?? {};
              return (
                <div key={sIdx} className="space-y-2">
                  <Label className="font-medium">
                    {sIdx + 1}. {section.title || `Section ${sIdx + 1}`}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {section.type}
                    </Badge>
                  </Label>
                  <div className="pl-4 border-l-2 border-muted">
                    <SectionEditor
                      section={section}
                      sectionIndex={sIdx}
                      data={sectionData}
                      onUpdate={handleSectionUpdate}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </DialogClose>
              <Button onClick={handleSaveData} disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          [class*="shadow-lg"] {
            box-shadow: none !important;
          }
          /* Make the report visible */
          [data-report-printable],
          [data-report-printable] * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
}
