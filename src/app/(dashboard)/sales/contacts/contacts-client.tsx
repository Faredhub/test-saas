"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, Upload, Star, Eye, Pencil, Trash2, Check, X } from "lucide-react";
import Link from "next/link";
import { createContact, updateContact, deleteContact, getLoyaltyBalance, getLoyaltyHistory, addLoyaltyPoints, redeemPoints } from "@/lib/actions/sales";
import { toast } from "sonner";

type Props = {
  initialData: Awaited<ReturnType<typeof import("@/lib/actions/sales").getContacts>>;
};

export function ContactsClient({ initialData }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<any | null>(null);

  async function handleEdit(formData: FormData) {
    if (!editingContact) return;
    startTransition(async () => {
      try {
        await updateContact(editingContact.id, {
          firstName: formData.get("firstName") as string,
          lastName: formData.get("lastName") as string,
          email: formData.get("email") as string,
          phone: formData.get("phone") as string,
          company: formData.get("company") as string,
          jobTitle: formData.get("jobTitle") as string,
          city: formData.get("city") as string,
          notes: formData.get("notes") as string,
        });
        toast.success("Contact updated successfully");
        setEditingContact(null);
      } catch {
        toast.error("Failed to update contact");
      }
    });
  }



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



  // Loyalty dialog state
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [loyaltyContact, setLoyaltyContact] = useState<{ id: string; name: string } | null>(null);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [loyaltyHistory, setLoyaltyHistory] = useState<{ id: string; points: number; type: string; description: string | null; createdAt: string }[]>([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  async function openLoyalty(contactId: string, name: string) {
    setLoyaltyContact({ id: contactId, name });
    setLoyaltyOpen(true);
    setLoyaltyLoading(true);
    try {
      const [balRes, histRes] = await Promise.all([
        getLoyaltyBalance(contactId),
        getLoyaltyHistory(contactId),
      ]);
      setLoyaltyBalance(balRes.balance);
      setLoyaltyHistory(histRes);
    } catch {
      toast.error("Failed to load loyalty data");
    } finally {
      setLoyaltyLoading(false);
    }
  }

  async function handleAddPoints(formData: FormData) {
    if (!loyaltyContact) return;
    startTransition(async () => {
      try {
        const pts = parseInt(formData.get("points") as string);
        const desc = formData.get("description") as string;
        if (!pts || pts <= 0) { toast.error("Enter valid points"); return; }
        await addLoyaltyPoints(loyaltyContact.id, pts, desc || "Manual addition");
        toast.success(`${pts} points added`);
        const [balRes, histRes] = await Promise.all([
          getLoyaltyBalance(loyaltyContact.id),
          getLoyaltyHistory(loyaltyContact.id),
        ]);
        setLoyaltyBalance(balRes.balance);
        setLoyaltyHistory(histRes);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add points");
      }
    });
  }

  async function handleRedeemPoints(formData: FormData) {
    if (!loyaltyContact) return;
    startTransition(async () => {
      try {
        const pts = parseInt(formData.get("redeemPoints") as string);
        const desc = formData.get("redeemDescription") as string;
        if (!pts || pts <= 0) { toast.error("Enter valid points"); return; }
        await redeemPoints(loyaltyContact.id, pts, desc || "Manual redemption");
        toast.success(`${pts} points redeemed`);
        const [balRes, histRes] = await Promise.all([
          getLoyaltyBalance(loyaltyContact.id),
          getLoyaltyHistory(loyaltyContact.id),
        ]);
        setLoyaltyBalance(balRes.balance);
        setLoyaltyHistory(histRes);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to redeem points");
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
          <Link href="/office/spreadsheets?template=sales-contacts&source=sales-contacts">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
            >
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
          </Link>

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
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/sales/contacts/${c.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                          onClick={() => setEditingContact(c)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                          onClick={() => openLoyalty(c.id, `${c.firstName} ${c.lastName || ""}`.trim())}
                          title="Loyalty Points"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        {confirmDeleteId === c.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => { handleDelete(c.id); setConfirmDeleteId(null); }}
                              title="Confirm Delete"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:bg-slate-100"
                              onClick={() => setConfirmDeleteId(null)}
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                            onClick={() => setConfirmDeleteId(c.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Loyalty Points Dialog */}
      <Dialog open={loyaltyOpen} onOpenChange={(open) => { setLoyaltyOpen(open); if (!open) setLoyaltyContact(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loyalty Points — {loyaltyContact?.name}</DialogTitle>
          </DialogHeader>

          {loyaltyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Balance */}
              <div className="flex items-center justify-center rounded-lg border bg-muted/30 py-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Points Balance</p>
                  <p className="text-4xl font-bold text-primary">{loyaltyBalance.toLocaleString()}</p>
                </div>
              </div>

              {/* Add / Redeem forms */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-semibold">Add Points</p>
                  <form action={handleAddPoints} className="space-y-2">
                    <Input name="points" type="number" min="1" placeholder="Points" required />
                    <Input name="description" placeholder="Description (optional)" />
                    <Button type="submit" size="sm" className="w-full" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      Add Points
                    </Button>
                  </form>
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-semibold">Redeem Points</p>
                  <form action={handleRedeemPoints} className="space-y-2">
                    <Input name="redeemPoints" type="number" min="1" max={loyaltyBalance} placeholder="Points" required />
                    <Input name="redeemDescription" placeholder="Description (optional)" />
                    <Button type="submit" size="sm" variant="outline" className="w-full" disabled={isPending || loyaltyBalance <= 0}>
                      {isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      Redeem Points
                    </Button>
                  </form>
                </div>
              </div>

              {/* History */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Points History</p>
                {loyaltyHistory.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No points history yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loyaltyHistory.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(h.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={
                              h.type === "EARNED" ? "bg-green-100 text-green-700" :
                                h.type === "REDEEMED" ? "bg-orange-100 text-orange-700" :
                                  h.type === "EXPIRED" ? "bg-red-100 text-red-700" :
                                    "bg-blue-100 text-blue-700"
                            }>
                              {h.type}
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-mono font-medium ${h.type === "EARNED" || h.type === "ADJUSTED" ? "text-green-600" : "text-red-600"}`}>
                            {h.type === "EARNED" || h.type === "ADJUSTED" ? "+" : "-"}{h.points}
                          </TableCell>
                          <TableCell className="text-sm">{h.description || "--"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContact} onOpenChange={(open) => { if (!open) setEditingContact(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
          {editingContact && (
            <form action={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name *</Label>
                  <Input id="edit-firstName" name="firstName" defaultValue={editingContact.firstName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input id="edit-lastName" name="lastName" defaultValue={editingContact.lastName || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" name="email" type="email" defaultValue={editingContact.email || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input id="edit-phone" name="phone" defaultValue={editingContact.phone || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-company">Company</Label>
                  <Input id="edit-company" name="company" defaultValue={editingContact.company || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-jobTitle">Job Title</Label>
                  <Input id="edit-jobTitle" name="jobTitle" defaultValue={editingContact.jobTitle || ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input id="edit-city" name="city" defaultValue={editingContact.city || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea id="edit-notes" name="notes" rows={2} defaultValue={editingContact.notes || ""} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingContact(null)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
