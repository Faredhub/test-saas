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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Trash2,
  Loader2,
  Send,
  Clock,
  MessageSquare,
  BarChart3,
  Phone,
  Users,
  CheckCircle,
  XCircle,
  Copy,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  createSMSCampaign,
  deleteSMSCampaign,
} from "@/lib/actions/marketing";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  SENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

type SMSCampaign = {
  id: string;
  name: string;
  body: string;
  recipients: number;
  sent: number;
  delivered: number;
  failed: number;
  status: string;
  provider: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

type SMSTemplate = {
  id: string;
  name: string;
  body: string;
};

type RecipientList = {
  id: string;
  name: string;
  count: number;
};

type Props = {
  initialData: { data: SMSCampaign[]; total: number };
  templates: SMSTemplate[];
  recipientLists: RecipientList[];
};

export function SMSClient({ initialData, templates, recipientLists }: Props) {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>(initialData.data);

  const [form, setForm] = useState({
    name: "",
    body: "",
    recipientListId: "",
    provider: "MSG91",
    scheduledAt: "",
  });
  const [charCount, setCharCount] = useState(0);

  const filtered = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.body.toLowerCase().includes(search.toLowerCase()) ||
      c.provider.toLowerCase().includes(search.toLowerCase()),
  );

  const analyticsData = campaigns
    .filter((c) => c.status === "SENT")
    .map((c) => ({
      name: c.name.length > 20 ? c.name.slice(0, 20) + "..." : c.name,
      sent: c.sent,
      delivered: c.delivered,
      failed: c.failed,
    }));

  const totalStats = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sent,
      delivered: acc.delivered + c.delivered,
      failed: acc.failed + c.failed,
    }),
    { sent: 0, delivered: 0, failed: 0 },
  );

  const handleChange = (field: string, value: string) => {
    if (field === "body") setCharCount(value.length);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    if (!form.name.trim() || !form.body.trim() || !form.recipientListId) {
      toast.error("Please fill all required fields");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createSMSCampaign({
          name: form.name,
          body: form.body,
          recipientListId: form.recipientListId,
          provider: form.provider,
          scheduledAt: form.scheduledAt || undefined,
        });
        setCampaigns((prev) => [result, ...prev]);
        toast.success("SMS campaign created");
        setIsCreateOpen(false);
        setForm({
          name: "",
          body: "",
          recipientListId: "",
          provider: "MSG91",
          scheduledAt: "",
        });
        setCharCount(0);
      } catch {
        toast.error("Failed to create campaign");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteSMSCampaign(id);
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        toast.success("Campaign deleted");
      } catch {
        toast.error("Failed to delete campaign");
      }
    });
  };

  const handlePickTemplate = (tpl: SMSTemplate) => {
    setForm((prev) => ({ ...prev, body: tpl.body }));
    setCharCount(tpl.body.length);
  };

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(v);

  const deliveryRate =
    totalStats.sent > 0
      ? ((totalStats.delivered / totalStats.sent) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SMS Marketing</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create SMS Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Diwali Flash Sale"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="body">Message Body *</Label>
                  <span
                    className={`text-xs ${charCount > 160 ? "text-red-500" : "text-muted-foreground"}`}
                  >
                    {charCount}/160 ({Math.ceil(charCount / 160) || 0} SMS)
                  </span>
                </div>
                <Textarea
                  id="body"
                  value={form.body}
                  onChange={(e) => handleChange("body", e.target.value)}
                  placeholder="Type your SMS message..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="mb-1 block">Quick Templates</Label>
                <div className="flex flex-wrap gap-1">
                  {templates.map((tpl) => (
                    <Button
                      key={tpl.id}
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => handlePickTemplate(tpl)}
                    >
                      {tpl.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Recipient List *</Label>
                <Select
                  value={form.recipientListId}
                  onValueChange={(v) =>
                    handleChange("recipientListId", v ?? "")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient list" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipientLists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({l.count} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Provider</Label>
                <Select
                  value={form.provider}
                  onValueChange={(v) => handleChange("provider", v ?? "MSG91")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MSG91">MSG91</SelectItem>
                    <SelectItem value="Twilio">Twilio</SelectItem>
                    <SelectItem value="TextLocal">TextLocal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="scheduledAt">Schedule Send (optional)</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) =>
                    handleChange("scheduledAt", e.target.value)
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreate} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {form.scheduledAt ? "Schedule" : "Save Draft"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">
            <MessageSquare className="mr-2 h-4 w-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Sent / Delivered</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No SMS campaigns found
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {c.body}
                      </TableCell>
                      <TableCell>{c.recipients.toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">
                          {c.sent.toLocaleString("en-IN")}
                        </span>
                        {" / "}
                        <span className="text-blue-600">
                          {c.delivered.toLocaleString("en-IN")}
                        </span>
                      </TableCell>
                      <TableCell>{c.provider}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[c.status] || "bg-gray-100"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.scheduledAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(c.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-500" />
                  {totalStats.sent.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Delivered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {totalStats.delivered.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {deliveryRate}% delivery rate
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  {totalStats.failed.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  {campaigns.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {analyticsData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sent" fill="#3b82f6" name="Sent" />
                    <Bar dataKey="delivered" fill="#10b981" name="Delivered" />
                    <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
