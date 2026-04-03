"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Inbox } from "lucide-react";
import { getFormSubmissions } from "@/lib/actions/organization";
import { format } from "date-fns";
import type { FormField } from "./builder";

type Form = {
  id: string;
  title: string;
  description?: string | null;
  fields: unknown;
};

type Submission = {
  id: string;
  data: unknown;
  submittedBy: string | null;
  submittedAt: Date;
};

export function FormSubmissions({
  form,
  onBack,
}: {
  form: Form;
  onBack: () => void;
}) {
  const fields = useMemo(
    () => (Array.isArray(form.fields) ? (form.fields as FormField[]) : []),
    [form.fields]
  );
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getFormSubmissions(form.id);
        setSubmissions(data as Submission[]);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    });
  }, [form.id]);

  function getCellValue(data: unknown, fieldId: string): string {
    if (!data || typeof data !== "object") return "";
    const obj = data as Record<string, unknown>;
    const val = obj[fieldId];
    if (Array.isArray(val)) return val.join(", ");
    if (val == null) return "";
    return String(val);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-bold">{form.title} &mdash; Submissions</h2>
            <p className="text-xs text-muted-foreground">
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {isPending && !loaded ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">No submissions yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    {fields.map((field) => (
                      <TableHead key={field.id} className="min-w-[120px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{field.label}</span>
                          <Badge variant="secondary" className="text-[9px] shrink-0">
                            {field.type}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-[160px]">Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub, idx) => (
                    <TableRow key={sub.id}>
                      <TableCell className="text-muted-foreground text-xs">
                        {idx + 1}
                      </TableCell>
                      {fields.map((field) => (
                        <TableCell key={field.id} className="text-sm max-w-[200px] truncate">
                          {getCellValue(sub.data, field.id) || (
                            <span className="text-muted-foreground/40">--</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(sub.submittedAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
