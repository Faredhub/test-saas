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
  Phone,
  CheckCircle,
  Eye,
  MessageCircle,
  BarChart3,
  FileText,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  createWhatsAppTemplate,
  deleteWhatsAppTemplate,
  createWhatsAppCampaign,
} from "@/lib/actions/marketing";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  SENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WATemplate = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WACampaign = any;

type Props = {
  templatesData: { data: WATemplate[]; total: number };
  initialData: { data: WACampaign[]; total: number };
};

export function WhatsAppClient({ templatesData, initialData }: Props) {
  const [activeTab, setActiveTab] = useState("templates");
  const [search, setSearch] = useState("");
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [templates, setTemplates] = useState<WATemplate[]>(templatesData.data);
  const [campaigns, setCampaigns] = useState<WACampaign[]>(initialData.data);

  const [tplForm, setTplForm] = useState({
    name: "",
    category: "UTILITY",
    language: "en",
    headerType: "TEXT" as "TEXT" | "IMAGE",
    headerText: "",
    body: "",
    footer: "",
    buttons: [] as Array<{ type: string; text: string; url?: string }>,
  });
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [buttonType, setButtonType] = useState("QUICK_REPLY");

  const [campaignForm, setCampaignForm] = useState({
    templateId: "",
    scheduledAt: "",
  });

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.body.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.templateName.toLowerCase().includes(search.toLowerCase()),
  );

  const addButton = () => {
    if (!buttonText.trim()) return;
    setTplForm((prev) => ({
      ...prev,
      buttons: [
        ...prev.buttons,
        {
          type: buttonType,
          text: buttonText,
          url: buttonType === "URL" ? buttonUrl : undefined,
        },
      ],
    }));
    setButtonText("");
    setButtonUrl("");
  };

  const handleCreateTemplate = () => {
    if (!tplForm.name.trim() || !tplForm.body.trim()) {
      toast.error("Name and body are required");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createWhatsAppTemplate({
          name: tplForm.name,
          category: tplForm.category,
          language: tplForm.language,
          headerType: tplForm.headerType,
          headerText: tplForm.headerType === "TEXT" ? tplForm.headerText : undefined,
          body: tplForm.body,
          footer: tplForm.footer,
          buttons: tplForm.buttons,
        });
        setTemplates((prev) => [result, ...prev]);
        toast.success("Template created");
        setIsTemplateOpen(false);
        setTplForm({
          name: "",
          category: "UTILITY",
          language: "en",
          headerType: "TEXT",
          headerText: "",
          body: "",
          footer: "",
          buttons: [],
        });
      } catch {
        toast.error("Failed to create template");
      }
    });
  };

  const handleDeleteTemplate = (id: string) => {
    startTransition(async () => {
      try {
        await deleteWhatsAppTemplate(id);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        toast.success("Template deleted");
      } catch {
        toast.error("Failed to delete template");
      }
    });
  };

  const handleCreateCampaign = () => {
    if (!campaignForm.templateId) {
      toast.error("Please select a template");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createWhatsAppCampaign({
          templateId: campaignForm.templateId,
          scheduledAt: campaignForm.scheduledAt || undefined,
        });
        setCampaigns((prev) => [result, ...prev]);
        toast.success("Campaign created");
        setIsCampaignOpen(false);
        setCampaignForm({ templateId: "", scheduledAt: "" });
      } catch {
        toast.error("Failed to create campaign");
      }
    });
  };

  const deliveryTimeline = campaigns
    .filter((c) => c.status === "SENT")
    .map((c, i) => ({
      day: `Day ${i + 1}`,
      sent: c.sent,
      delivered: c.delivered,
      read: c.read,
      replied: c.replied,
    }));

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const totalStats = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sent,
      delivered: acc.delivered + c.delivered,
      read: acc.read + c.read,
      replied: acc.replied + c.replied,
    }),
    { sent: 0, delivered: 0, read: 0, replied: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">WhatsApp Marketing</h1>
        <div className="flex gap-2">
          <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
            <DialogTrigger>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" /> New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create WhatsApp Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tpl-name">Template Name *</Label>
                    <Input
                      id="tpl-name"
                      value={tplForm.name}
                      onChange={(e) =>
                        setTplForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="e.g. order_confirmation"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={tplForm.category}
                      onValueChange={(v) =>
                        setTplForm((p) => ({ ...p, category: v ?? "UTILITY" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTILITY">Utility</SelectItem>
                        <SelectItem value="MARKETING">Marketing</SelectItem>
                        <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Language</Label>
                    <Select
                      value={tplForm.language}
                      onValueChange={(v) =>
                        setTplForm((p) => ({ ...p, language: v ?? "en" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="mr">Marathi</SelectItem>
                        <SelectItem value="te">Telugu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Header Type</Label>
                    <Select
                      value={tplForm.headerType}
                      onValueChange={(v) =>
                        setTplForm((p) => ({ ...p, headerType: v as "TEXT" | "IMAGE" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEXT">Text Header</SelectItem>
                        <SelectItem value="IMAGE">Image Header</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {tplForm.headerType === "TEXT" && (
                  <div>
                    <Label htmlFor="tpl-header">Header Text</Label>
                    <Input
                      id="tpl-header"
                      value={tplForm.headerText}
                      onChange={(e) =>
                        setTplForm((p) => ({ ...p, headerText: e.target.value }))
                      }
                      placeholder="Header that appears at top"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="tpl-body">Body *</Label>
                  <Textarea
                    id="tpl-body"
                    value={tplForm.body}
                    onChange={(e) =>
                      setTplForm((p) => ({ ...p, body: e.target.value }))
                    }
                    placeholder="Message body with {{1}} variables..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="tpl-footer">Footer</Label>
                  <Input
                    id="tpl-footer"
                    value={tplForm.footer}
                    onChange={(e) =>
                      setTplForm((p) => ({ ...p, footer: e.target.value }))
                    }
                    placeholder="e.g. TixelTech Team"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Buttons</Label>
                  <div className="flex gap-2 mb-2">
                    <Select value={buttonType} onValueChange={(v) => setButtonType(v ?? "QUICK_REPLY")}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                        <SelectItem value="URL">URL</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="Button text"
                      className="flex-1"
                    />
                    {buttonType === "URL" && (
                      <Input
                        value={buttonUrl}
                        onChange={(e) => setButtonUrl(e.target.value)}
                        placeholder="URL"
                        className="flex-1"
                      />
                    )}
                    <Button type="button" variant="outline" onClick={addButton}>
                      Add
                    </Button>
                  </div>
                  {tplForm.buttons.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tplForm.buttons.map((b, i) => (
                        <Badge key={i} variant="secondary">
                          {b.text} ({b.type})
                          {b.url ? ` → ${b.url}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <DialogClose render={<Button variant="outline" type="button" />}>
                    Cancel
                  </DialogClose>
                  <Button onClick={handleCreateTemplate} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCampaignOpen} onOpenChange={setIsCampaignOpen}>
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Create WhatsApp Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Select Template *</Label>
                    <Select
                      value={campaignForm.templateId}
                      onValueChange={(v) =>
                        setCampaignForm((p) => ({ ...p, templateId: v ?? "" }))
                      }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="camp-schedule">Schedule Send (optional)</Label>
                  <Input
                    id="camp-schedule"
                    type="datetime-local"
                    value={campaignForm.scheduledAt}
                    onChange={(e) =>
                      setCampaignForm((p) => ({
                        ...p,
                        scheduledAt: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <DialogClose render={<Button variant="outline" type="button" />}>
                    Cancel
                  </DialogClose>
                  <Button onClick={handleCreateCampaign} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {campaignForm.scheduledAt ? "Schedule" : "Save Draft"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">
            <FileText className="mr-2 h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Send className="mr-2 h-4 w-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
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
                    <TableHead>Template</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Header</TableHead>
                    <TableHead>Body</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No templates found
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredTemplates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell>{t.language}</TableCell>
                      <TableCell>
                        {t.headerType === "TEXT" ? (
                          <span className="text-sm">{t.headerText}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <ImageIcon className="h-3 w-3" /> Image
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm">
                        {t.body}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            t.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }
                        >
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(t.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTemplate(t.id)}
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
                    <TableHead>Template</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Read</TableHead>
                    <TableHead>Replied</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No campaigns found
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredCampaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.templateName}</TableCell>
                      <TableCell>{c.recipients.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-blue-600 font-medium">
                        {c.sent.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {c.delivered.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-purple-500" />
                          {c.read.toLocaleString("en-IN")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3 text-amber-500" />
                          {c.replied.toLocaleString("en-IN")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[c.status] || "bg-gray-100"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.scheduledAt)}
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
                  Messages Sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.sent.toLocaleString("en-IN")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Delivery Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalStats.sent > 0
                    ? ((totalStats.delivered / totalStats.sent) * 100).toFixed(1)
                    : "0"}
                  %
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Read Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalStats.delivered > 0
                    ? ((totalStats.read / totalStats.delivered) * 100).toFixed(1)
                    : "0"}
                  %
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Reply Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalStats.read > 0
                    ? ((totalStats.replied / totalStats.read) * 100).toFixed(1)
                    : "0"}
                  %
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Message Funnel (Sent Campaigns)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  layout="vertical"
                  data={[
                    { stage: "Sent", count: totalStats.sent, fill: "#3b82f6" },
                    { stage: "Delivered", count: totalStats.delivered, fill: "#10b981" },
                    { stage: "Read", count: totalStats.read, fill: "#8b5cf6" },
                    { stage: "Replied", count: totalStats.replied, fill: "#f59e0b" },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {deliveryTimeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={deliveryTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="sent"
                      stroke="#3b82f6"
                      name="Sent"
                    />
                    <Line
                      type="monotone"
                      dataKey="delivered"
                      stroke="#10b981"
                      name="Delivered"
                    />
                    <Line
                      type="monotone"
                      dataKey="read"
                      stroke="#8b5cf6"
                      name="Read"
                    />
                    <Line
                      type="monotone"
                      dataKey="replied"
                      stroke="#f59e0b"
                      name="Replied"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
