"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Send,
  Eye,
  MousePointerClick,
  Loader2,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Pause,
  XCircle,
  ArrowLeft,
  BarChart3,
  Pencil,
  Trash2,
  Paintbrush,
} from "lucide-react";
import { usePermission } from "@/hooks/use-permission";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createCampaign,
  updateCampaign,
  scheduleCampaign,
  sendCampaign,
  pauseCampaign,
  cancelCampaign,
  deleteCampaign,
} from "@/lib/actions/marketing";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  SENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-green-100 text-green-700",
  PAUSED: "bg-orange-100 text-orange-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const channelIcons: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  SMS: <MessageSquare className="h-4 w-4" />,
  WHATSAPP: <Smartphone className="h-4 w-4" />,
};

type Stats = {
  totalCampaigns: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  draft: number;
  scheduled: number;
  sent: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Campaign = any;

type Props = {
  initialData: { data: Campaign[]; total: number };
  stats: Stats;
  segments: string[];
};

export function CampaignsClient({ initialData, stats, segments }: Props) {
  const { canCreate, canUpdate, canDelete } = usePermission();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [scheduleDialogId, setScheduleDialogId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [designInBuilder, setDesignInBuilder] = useState(false);

  const campaigns = initialData.data;
  const filtered = campaigns.filter(
    (c: Campaign) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.subject && c.subject.toLowerCase().includes(search.toLowerCase()))
  );

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const campaign = await createCampaign({
          name: formData.get("name") as string,
          type: (formData.get("type") as string) as "REGULAR" | "AUTOMATED" | "AB_TEST",
          channel: (formData.get("channel") as string) as "EMAIL" | "SMS" | "WHATSAPP",
          subject: formData.get("subject") as string,
          content: formData.get("content") as string,
          segmentTags: selectedTags,
        });
        toast.success("Campaign created successfully");
        setIsOpen(false);
        setSelectedTags([]);
        if (designInBuilder && campaign.channel === "EMAIL") {
          router.push(`/marketing/email-builder?campaignId=${campaign.id}`);
          return;
        }
      } catch {
        toast.error("Failed to create campaign");
      }
    });
  }

  function handleUpdate(formData: FormData) {
    if (!editingCampaign) return;
    startTransition(async () => {
      try {
        await updateCampaign(editingCampaign.id, {
          name: formData.get("name") as string,
          type: (formData.get("type") as string) as "REGULAR" | "AUTOMATED" | "AB_TEST",
          channel: (formData.get("channel") as string) as "EMAIL" | "SMS" | "WHATSAPP",
          subject: formData.get("subject") as string,
          content: formData.get("content") as string,
          segmentTags: selectedTags,
        });
        toast.success("Campaign updated");
        setEditingCampaign(null);
        setSelectedTags([]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update campaign");
      }
    });
  }

  function handleSchedule() {
    if (!scheduleDialogId || !scheduleDate) return;
    startTransition(async () => {
      try {
        await scheduleCampaign(scheduleDialogId, new Date(scheduleDate));
        toast.success("Campaign scheduled");
        setScheduleDialogId(null);
        setScheduleDate("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to schedule campaign");
      }
    });
  }

  function handleSend(id: string) {
    startTransition(async () => {
      try {
        await sendCampaign(id);
        toast.success("Campaign sent successfully");
        setSelectedCampaign(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to send campaign");
      }
    });
  }

  function handlePause(id: string) {
    startTransition(async () => {
      try {
        await pauseCampaign(id);
        toast.success("Campaign paused");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to pause campaign");
      }
    });
  }

  function handleCancel(id: string) {
    startTransition(async () => {
      try {
        await cancelCampaign(id);
        toast.success("Campaign cancelled");
        setSelectedCampaign(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to cancel campaign");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    startTransition(async () => {
      try {
        await deleteCampaign(id);
        toast.success("Campaign deleted");
        if (selectedCampaign?.id === id) setSelectedCampaign(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete campaign");
      }
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  // Detail view
  if (selectedCampaign) {
    const c = selectedCampaign;
    const openRate =
      c.totalSent > 0 ? ((c.totalOpened / c.totalSent) * 100).toFixed(1) : "0";
    const clickRate =
      c.totalSent > 0 ? ((c.totalClicked / c.totalSent) * 100).toFixed(1) : "0";
    const bounceRate =
      c.totalSent > 0 ? ((c.totalBounced / c.totalSent) * 100).toFixed(1) : "0";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{c.name}</h1>
            <p className="text-muted-foreground">{c.subject || "No subject"}</p>
          </div>
          <div className="flex items-center gap-2">
            {channelIcons[c.channel]}
            <Badge className={statusColors[c.status]}>{c.status}</Badge>
          </div>
        </div>

        {/* Performance metrics */}
        {c.status === "SENT" && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {c.totalSent.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Opened</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openRate}%</div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(parseFloat(openRate), 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.totalOpened.toLocaleString()} of {c.totalSent.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Clicked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clickRate}%</div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${Math.min(parseFloat(clickRate), 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.totalClicked.toLocaleString()} of {c.totalSent.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Bounced</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bounceRate}%</div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all"
                    style={{ width: `${Math.min(parseFloat(bounceRate), 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.totalBounced.toLocaleString()} of {c.totalSent.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Campaign details */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="font-medium">{c.type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Channel</Label>
                <p className="flex items-center gap-2 font-medium">
                  {channelIcons[c.channel]} {c.channel}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="font-medium">
                  {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>
              {c.scheduledAt && (
                <div>
                  <Label className="text-muted-foreground">Scheduled For</Label>
                  <p className="font-medium">
                    {new Date(c.scheduledAt).toLocaleString()}
                  </p>
                </div>
              )}
              {c.sentAt && (
                <div>
                  <Label className="text-muted-foreground">Sent At</Label>
                  <p className="font-medium">
                    {new Date(c.sentAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {c.segmentTags.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Segment Tags</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.segmentTags.map((tag: string) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {c.content && (
              <div>
                <Label className="text-muted-foreground">Content</Label>
                <div className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/50 p-4 text-sm">
                  {c.content}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {c.status !== "SENT" && c.status !== "CANCELLED" && (
          <div className="flex gap-2">
            {c.status === "DRAFT" && (
              <>
                <Button
                  onClick={() => {
                    setEditingCampaign(c);
                    setSelectedTags(c.segmentTags);
                    setSelectedCampaign(null);
                  }}
                  variant="outline"
                >
                  Edit
                </Button>
                <Button
                  onClick={() => {
                    setScheduleDialogId(c.id);
                    setSelectedCampaign(null);
                  }}
                  variant="outline"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule
                </Button>
                <Button onClick={() => handleSend(c.id)} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Now
                </Button>
              </>
            )}
            {(c.status === "SCHEDULED" || c.status === "SENDING") && (
              <Button
                variant="outline"
                onClick={() => handlePause(c.id)}
                disabled={isPending}
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}
            {c.status === "SCHEDULED" && (
              <Button onClick={() => handleSend(c.id)} disabled={isPending}>
                <Send className="mr-2 h-4 w-4" />
                Send Now
              </Button>
            )}
            <Button
              variant="outline"
              className="text-red-600"
              onClick={() => handleCancel(c.id)}
              disabled={isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage email, SMS, and WhatsApp campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/marketing">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Overview
            </Button>
          </Link>
          {canCreate("campaigns") && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Campaign</DialogTitle>
                </DialogHeader>
                <form action={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Campaign Name *</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" name="subject" placeholder="Email subject line..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select name="type" defaultValue="REGULAR">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REGULAR">Regular</SelectItem>
                          <SelectItem value="AUTOMATED">Automated</SelectItem>
                          <SelectItem value="AB_TEST">A/B Test</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="channel">Channel</Label>
                      <Select name="channel" defaultValue="EMAIL">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="SMS">SMS</SelectItem>
                          <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {segments.length > 0 && (
                    <div className="space-y-2">
                      <Label>Target Segments</Label>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {segments.map((tag) => {
                          const isSelected = selectedTags.includes(tag);
                          return (
                            <Badge
                              key={tag}
                              variant={isSelected ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedTags((prev) =>
                                  isSelected
                                    ? prev.filter((t) => t !== tag)
                                    : [...prev, tag]
                                );
                              }}
                            >
                              {tag}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      name="content"
                      rows={5}
                      placeholder="Write your campaign message..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="designInBuilder"
                      checked={designInBuilder}
                      onCheckedChange={(checked) => setDesignInBuilder(checked === true)}
                    />
                    <Label htmlFor="designInBuilder" className="text-sm">
                      Design in Builder (redirect to email designer after creation)
                    </Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                      Cancel
                    </DialogClose>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Campaign
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSent.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRate}%</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clickRate}%</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bounceRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Campaign list */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Opened</TableHead>
                <TableHead className="text-right">Clicked</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No campaigns found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c: Campaign) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedCampaign(c)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        {c.subject && (
                          <p className="text-sm text-muted-foreground">{c.subject}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {channelIcons[c.channel]}
                        {c.channel}
                      </span>
                    </TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[c.status]}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.totalSent.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.totalOpened.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.totalClicked.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {c.channel === "EMAIL" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/30 cursor-pointer"
                            onClick={() => router.push(`/marketing/email-builder?campaignId=${c.id}`)}
                            title="Email Designer"
                          >
                            <Paintbrush className="h-4 w-4" />
                            <span className="sr-only">Design</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 cursor-pointer"
                          onClick={() => setSelectedCampaign(c)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                        {canUpdate("campaigns") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800 cursor-pointer"
                            onClick={() => {
                              setEditingCampaign(c);
                              setSelectedTags(c.segmentTags || []);
                            }}
                            title="Edit Campaign"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        )}
                        {canDelete("campaigns") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
                            onClick={() => handleDelete(c.id)}
                            title="Delete Campaign"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
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

      {/* Schedule dialog */}
      <Dialog
        open={!!scheduleDialogId}
        onOpenChange={(open) => {
          if (!open) {
            setScheduleDialogId(null);
            setScheduleDate("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleDate">Send Date & Time</Label>
              <Input
                id="scheduleDate"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setScheduleDialogId(null);
                  setScheduleDate("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSchedule} disabled={isPending || !scheduleDate}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editingCampaign}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCampaign(null);
            setSelectedTags([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          {editingCampaign && (
            <form action={handleUpdate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Campaign Name *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editingCampaign.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-subject">Subject</Label>
                  <Input
                    id="edit-subject"
                    name="subject"
                    defaultValue={editingCampaign.subject || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select name="type" defaultValue={editingCampaign.type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                      <SelectItem value="AUTOMATED">Automated</SelectItem>
                      <SelectItem value="AB_TEST">A/B Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-channel">Channel</Label>
                  <Select name="channel" defaultValue={editingCampaign.channel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {segments.length > 0 && (
                <div className="space-y-2">
                  <Label>Segment Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {segments.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-content">Content</Label>
                <Textarea
                  id="edit-content"
                  name="content"
                  rows={8}
                  defaultValue={editingCampaign.content || ""}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingCampaign(null);
                    setSelectedTags([]);
                  }}
                >
                  Cancel
                </Button>
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
