"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { submitForm } from "@/lib/actions/organization";
import { toast } from "sonner";
import type { FormField } from "./builder";

type Form = {
  id: string;
  title: string;
  description?: string | null;
  fields: unknown;
};

export function FormPreview({
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
  const [values, setValues] = useState<Record<string, string>>({});
  const [checkboxValues, setCheckboxValues] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  function setValue(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function toggleCheckbox(fieldId: string, option: string) {
    setCheckboxValues((prev) => {
      const current = prev[fieldId] || [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [fieldId]: next };
    });
  }

  // Evaluate conditional visibility
  function isFieldVisible(field: FormField): boolean {
    if (!field.showIf) return true;
    const dependValue = values[field.showIf.fieldId] || "";
    return dependValue === field.showIf.equals;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Build submission data
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      if (!isFieldVisible(field)) continue;
      if (field.type === "checkbox") {
        data[field.id] = checkboxValues[field.id] || [];
      } else {
        data[field.id] = values[field.id] || "";
      }
    }

    // Validate required fields
    for (const field of fields) {
      if (!isFieldVisible(field)) continue;
      if (field.required) {
        const val = data[field.id];
        if (field.type === "checkbox") {
          if (!Array.isArray(val) || val.length === 0) {
            toast.error(`"${field.label}" is required`);
            return;
          }
        } else if (!val || (typeof val === "string" && !val.trim())) {
          toast.error(`"${field.label}" is required`);
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        await submitForm(form.id, data);
        toast.success("Form submitted successfully");
        setValues({});
        setCheckboxValues({});
      } catch {
        toast.error("Failed to submit form");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Forms
      </Button>

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{form.title}</CardTitle>
            {form.description && <CardDescription>{form.description}</CardDescription>}
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">This form has no fields yet.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {fields.map((field) => {
                  if (!isFieldVisible(field)) return null;

                  return (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-sm">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>

                      {field.type === "text" && (
                        <Input
                          value={values[field.id] || ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}

                      {field.type === "number" && (
                        <Input
                          type="number"
                          value={values[field.id] || ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}

                      {field.type === "email" && (
                        <Input
                          type="email"
                          value={values[field.id] || ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          placeholder={field.placeholder || "email@example.com"}
                        />
                      )}

                      {field.type === "phone" && (
                        <Input
                          type="tel"
                          value={values[field.id] || ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          placeholder={field.placeholder || "+91 ..."}
                        />
                      )}

                      {field.type === "textarea" && (
                        <Textarea
                          value={values[field.id] || ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          rows={3}
                        />
                      )}

                      {field.type === "date" && (
                        <Input
                          type="date"
                          value={values[field.id] || ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                        />
                      )}

                      {field.type === "file" && (
                        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                          File upload (placeholder - not yet implemented)
                        </div>
                      )}

                      {field.type === "select" && (
                        <Select
                          value={values[field.id] || ""}
                          onValueChange={(val) => setValue(field.id, val ?? "")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={field.placeholder || "Select an option"} />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.type === "radio" && (
                        <div className="space-y-2">
                          {(field.options || []).map((opt) => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={field.id}
                                value={opt}
                                checked={values[field.id] === opt}
                                onChange={() => setValue(field.id, opt)}
                                className="h-4 w-4 accent-primary"
                              />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === "checkbox" && (
                        <div className="space-y-2">
                          {(field.options || []).map((opt) => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={(checkboxValues[field.id] || []).includes(opt)}
                                onCheckedChange={() => toggleCheckbox(field.id, opt)}
                              />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Submit
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
