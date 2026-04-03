"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  Plus,
  Tag,
  Star,
} from "lucide-react";
import { updateContact, createActivity } from "@/lib/actions/sales";
import { toast } from "sonner";
import type { getContactById } from "@/lib/actions/sales";

type Contact = NonNullable<Awaited<ReturnType<typeof getContactById>>>;

const dealStageLabels: Record<string, { label: string; color: string }> = {
  PROSPECTING: { label: "Prospecting", color: "bg-slate-100 text-slate-700" },
  QUALIFICATION: { label: "Qualification", color: "bg-blue-100 text-blue-700" },
  PROPOSAL: { label: "Proposal", color: "bg-amber-100 text-amber-700" },
  NEGOTIATION: { label: "Negotiation", color: "bg-orange-100 text-orange-700" },
  CLOSED_WON: { label: "Won", color: "bg-green-100 text-green-700" },
  CLOSED_LOST: { label: "Lost", color: "bg-red-100 text-red-700" },
};

const invoiceStatusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  REFUNDED: "bg-purple-100 text-purple-700",
};

const activityTypeIcons: Record<string, string> = {
  CALL: "📞",
  EMAIL: "📧",
  MEETING: "🤝",
  NOTE: "📝",
  TASK: "✅",
  VISIT: "🏢",
};

function formatCurrency(value: unknown) {
  if (!value) return "--";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "--";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ContactDetail({ contact }: { contact: Contact }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const fullName = `${contact.firstName} ${contact.lastName || ""}`.trim();

  async function handleEdit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateContact(contact.id, {
          firstName: formData.get("firstName") as string,
          lastName: (formData.get("lastName") as string) || undefined,
          email: (formData.get("email") as string) || undefined,
          phone: (formData.get("phone") as string) || undefined,
          company: (formData.get("company") as string) || undefined,
          jobTitle: (formData.get("jobTitle") as string) || undefined,
          address: (formData.get("address") as string) || undefined,
          city: (formData.get("city") as string) || undefined,
          state: (formData.get("state") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Contact updated successfully");
        setEditOpen(false);
        router.refresh();
      } catch {
        toast.error("Failed to update contact");
      }
    });
  }

  async function handleLogActivity(formData: FormData) {
    startTransition(async () => {
      try {
        await createActivity({
          type: formData.get("type") as "CALL" | "EMAIL" | "MEETING" | "NOTE" | "TASK" | "VISIT",
          subject: formData.get("subject") as string,
          description: (formData.get("description") as string) || undefined,
          outcome: (formData.get("outcome") as string) || undefined,
          contactId: contact.id,
        });
        toast.success("Activity logged");
        setActivityOpen(false);
        router.refresh();
      } catch {
        toast.error("Failed to log activity");
      }
    });
  }

  const addressParts = [contact.address, contact.city, contact.state, contact.country, contact.pincode].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales/contacts">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
              {contact.company && (
                <Badge variant="outline">{contact.company}</Badge>
              )}
              {contact.tags.map((tag) => (
                <Badge key={tag} className="border-0 bg-indigo-100 text-indigo-700 text-xs">
                  <Tag className="mr-1 h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
            {contact.jobTitle && (
              <p className="mt-1 text-sm text-muted-foreground">{contact.jobTitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              <Plus className="h-4 w-4" />
              Log Activity
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Activity</DialogTitle>
              </DialogHeader>
              <form action={handleLogActivity} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="actType">Type</Label>
                  <select
                    name="type"
                    id="actType"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    required
                  >
                    <option value="CALL">Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="MEETING">Meeting</option>
                    <option value="NOTE">Note</option>
                    <option value="TASK">Task</option>
                    <option value="VISIT">Visit</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actSubject">Subject *</Label>
                  <Input id="actSubject" name="subject" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actDesc">Description</Label>
                  <Textarea id="actDesc" name="description" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actOutcome">Outcome</Label>
                  <Input id="actOutcome" name="outcome" />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Log Activity
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Pencil className="h-4 w-4" />
              Edit Contact
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Contact</DialogTitle>
              </DialogHeader>
              <form action={handleEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name *</Label>
                    <Input id="editFirstName" name="firstName" defaultValue={contact.firstName} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name</Label>
                    <Input id="editLastName" name="lastName" defaultValue={contact.lastName ?? ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editEmail">Email</Label>
                    <Input id="editEmail" name="email" type="email" defaultValue={contact.email ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPhone">Phone</Label>
                    <Input id="editPhone" name="phone" defaultValue={contact.phone ?? ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editCompany">Company</Label>
                    <Input id="editCompany" name="company" defaultValue={contact.company ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editJobTitle">Job Title</Label>
                    <Input id="editJobTitle" name="jobTitle" defaultValue={contact.jobTitle ?? ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAddress">Address</Label>
                  <Textarea id="editAddress" name="address" rows={2} defaultValue={contact.address ?? ""} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editCity">City</Label>
                    <Input id="editCity" name="city" defaultValue={contact.city ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editState">State</Label>
                    <Input id="editState" name="state" defaultValue={contact.state ?? ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editNotes">Notes</Label>
                  <Textarea id="editNotes" name="notes" rows={3} defaultValue={contact.notes ?? ""} />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{contact.email || "--"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{contact.phone || "--"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{contact.company || "--"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{contact.jobTitle || "--"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>{addressParts.length > 0 ? addressParts.join(", ") : "--"}</span>
            </div>
            {contact.owner && (
              <>
                <Separator />
                <div className="text-sm">
                  <span className="text-muted-foreground">Owner: </span>
                  <span className="font-medium">{contact.owner.name}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(contact.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Updated</p>
                <p className="font-medium">{formatDate(contact.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {contact.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="deals" className="w-full">
        <TabsList>
          <TabsTrigger value="deals">Deals ({contact.deals.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({contact.invoices.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities ({contact.activities.length})</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty Points ({contact.loyaltyPoints.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="deals">
          <Card>
            <CardContent className="pt-6">
              {contact.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No deals linked</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Probability</TableHead>
                      <TableHead>Owner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contact.deals.map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell>
                          <Link
                            href={`/sales/deals/${deal.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {deal.title}
                          </Link>
                        </TableCell>
                        <TableCell className="tabular-nums">{formatCurrency(deal.value)}</TableCell>
                        <TableCell>
                          <Badge className={`border-0 ${dealStageLabels[deal.stage]?.color ?? ""}`}>
                            {dealStageLabels[deal.stage]?.label ?? deal.stage}
                          </Badge>
                        </TableCell>
                        <TableCell>{deal.probability}%</TableCell>
                        <TableCell>{deal.owner?.name ?? "--"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="pt-6">
              {contact.invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No invoices linked</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Created By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contact.invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <Link
                            href={`/sales/invoices/${inv.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {inv.invoiceNo}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border-0 ${invoiceStatusColors[inv.status] ?? ""}`}>
                            {inv.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{formatCurrency(inv.total)}</TableCell>
                        <TableCell>{formatDate(inv.dueDate)}</TableCell>
                        <TableCell>{inv.createdBy?.name ?? "--"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardContent className="pt-6">
              {contact.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No activities recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {contact.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <span className="text-lg mt-0.5">{activityTypeIcons[activity.type] ?? "📌"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{activity.subject}</p>
                          <Badge variant="outline" className="text-[10px]">{activity.type}</Badge>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{activity.description}</p>
                        )}
                        {activity.outcome && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Outcome: <span className="font-medium">{activity.outcome}</span>
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardContent className="pt-6">
              {contact.loyaltyPoints.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <Star className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No loyalty points history</p>
                </div>
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
                    {contact.loyaltyPoints.map((lp) => (
                      <TableRow key={lp.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(lp.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={
                            lp.type === "EARNED" ? "bg-green-100 text-green-700" :
                            lp.type === "REDEEMED" ? "bg-orange-100 text-orange-700" :
                            lp.type === "EXPIRED" ? "bg-red-100 text-red-700" :
                            "bg-blue-100 text-blue-700"
                          }>
                            {lp.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-mono font-medium ${
                          lp.type === "EARNED" || lp.type === "ADJUSTED" ? "text-green-600" : "text-red-600"
                        }`}>
                          {lp.type === "EARNED" || lp.type === "ADJUSTED" ? "+" : "-"}{lp.points}
                        </TableCell>
                        <TableCell className="text-sm">{lp.description || "--"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
