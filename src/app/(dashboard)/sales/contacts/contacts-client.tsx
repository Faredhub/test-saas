"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Loader2, Download, Upload } from "lucide-react";
import { createContact, deleteContact, exportContacts, importContacts } from "@/lib/actions/sales";
import { downloadCSV, parseCSV } from "@/lib/export";
import { toast } from "sonner";

type Props = {
  initialData: Awaited<ReturnType<typeof import("@/lib/actions/sales").getContacts>>;
};

export function ContactsClient({ initialData }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [importRawCSV, setImportRawCSV] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createContact({
          firstName: formData.get("firstName") as string,
          lastName: formData.get("lastName") as string,
          email: formData.get("email") as string,
          phone: formData.get("phone") as string,
          company: formData.get("company") as string,
          jobTitle: formData.get("jobTitle") as string,
          city: formData.get("city") as string,
          notes: formData.get("notes") as string,
        });
        toast.success("Contact created");
        setIsOpen(false);
      } catch {
        toast.error("Failed to create contact");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteContact(id);
        toast.success("Contact deleted");
      } catch {
        toast.error("Failed to delete contact");
      }
    });
  }

  async function handleExport() {
    startTransition(async () => {
      try {
        const csv = await exportContacts();
        downloadCSV(`contacts-${new Date().toISOString().slice(0, 10)}.csv`, csv);
        toast.success("Contacts exported successfully");
      } catch {
        toast.error("Failed to export contacts");
      }
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportRawCSV(text);
      const parsed = parseCSV(text);
      setImportPreview({
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 5),
      });
    };
    reader.readAsText(file);
  }

  async function handleImportConfirm() {
    if (!importRawCSV) return;
    startTransition(async () => {
      try {
        const result = await importContacts(importRawCSV);
        if (result.imported > 0) {
          toast.success(`Imported ${result.imported} contacts successfully`);
        }
        if (result.errors.length > 0) {
          toast.error(`${result.errors.length} error(s): ${result.errors.slice(0, 3).join("; ")}`);
        }
        setImportOpen(false);
        setImportPreview(null);
        setImportRawCSV("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch {
        toast.error("Failed to import contacts");
      }
    });
  }

  const filtered = initialData.data.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(s) ||
      (c.lastName?.toLowerCase().includes(s) ?? false) ||
      (c.email?.toLowerCase().includes(s) ?? false) ||
      (c.company?.toLowerCase().includes(s) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">Manage your customer contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) { setImportPreview(null); setImportRawCSV(""); } }}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              <Upload className="h-4 w-4" />
              Import CSV
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Contacts from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select CSV file</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required column: firstName. Optional: lastName, email, phone, company, jobTitle, city, state, country
                  </p>
                </div>

                {importPreview && importPreview.headers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Preview (first 5 rows)</Label>
                    <div className="overflow-auto rounded-md border max-h-60">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {importPreview.headers.map((h, i) => (
                              <TableHead key={i} className="text-xs whitespace-nowrap">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.rows.map((row, ri) => (
                            <TableRow key={ri}>
                              {row.map((cell, ci) => (
                                <TableCell key={ci} className="text-xs py-1.5">{cell || "—"}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button onClick={handleImportConfirm} disabled={isPending || !importPreview}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import Contacts
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Contact
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Contact</DialogTitle></DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" name="company" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input id="jobTitle" name="jobTitle" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Contact
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search contacts..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No contacts found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.firstName} {c.lastName}</TableCell>
                    <TableCell>{c.company ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.city ?? "—"}</TableCell>
                    <TableCell>{c.owner?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
