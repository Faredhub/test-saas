"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Loader2,
  Target,
  MapPin,
  Briefcase,
  Trash2,
  Eye,
  Pencil,
  Mail,
  Crown,
  UserCheck,
  Building2,
  FileText,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { createSalesTeam, updateSalesTeam, deleteSalesTeam, getSalesTeams } from "@/lib/actions/sales";
import { toast } from "sonner";

type SalesTeam = Awaited<ReturnType<typeof getSalesTeams>>[number];

type FormDataOptions = {
  users: { id: string; name: string | null; email: string | null }[];
  contacts: { id: string; name: string; email: string | null; salesTeamId: string | null }[];
  quotations: { id: string; quotationNo: string; total: number; status: string; salesTeamId: string | null }[];
  orders: { id: string; orderNo: string; total: number; status: string; salesTeamId: string | null }[];
};

type Props = {
  initialTeams: SalesTeam[];
  formData: FormDataOptions;
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const EXAMPLE_PRESETS = [
  {
    name: "North Region Sales Team",
    region: "North India",
    productLine: "Software & Enterprise",
    targetQuota: "5000000",
    emailAlias: "north-sales@tixeltech.com",
    notes: "Handles corporate accounts, government contracts, and enterprise SaaS leads across North India.",
  },
  {
    name: "South Region Sales Team",
    region: "South India",
    productLine: "Hardware & Devices",
    targetQuota: "4000000",
    emailAlias: "south-sales@tixeltech.com",
    notes: "Focuses on tech parks, manufacturing hubs, and retail tech hardware in Bengaluru and Chennai.",
  },
  {
    name: "Government Projects Team",
    region: "National (India)",
    productLine: "Gov & PSU Solutions",
    targetQuota: "10000000",
    emailAlias: "gov-projects@tixeltech.com",
    notes: "Dedicated tender bidding, public sector engagements, and smart city infrastructure projects.",
  },
  {
    name: "Retail Sales Team",
    region: "All Regions",
    productLine: "Retail & FMCG POS",
    targetQuota: "2500000",
    emailAlias: "retail-sales@tixeltech.com",
    notes: "Direct retail sales, franchise onboardings, and distribution network accounts.",
  },
];

export function SalesTeamsClient({ initialTeams, formData }: Props) {
  const [teams, setTeams] = useState<SalesTeam[]>(initialTeams);
  const [isOpen, setIsOpen] = useState(false);
  const [viewTeam, setViewTeam] = useState<SalesTeam | null>(null);
  const [editTeam, setEditTeam] = useState<SalesTeam | null>(null);
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<SalesTeam | null>(null);

  // Create state
  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [region, setRegion] = useState("");
  const [productLine, setProductLine] = useState("");
  const [targetQuota, setTargetQuota] = useState("");
  const [emailAlias, setEmailAlias] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedQuotationIds, setSelectedQuotationIds] = useState<string[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editLeaderId, setEditLeaderId] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editProductLine, setEditProductLine] = useState("");
  const [editTargetQuota, setEditTargetQuota] = useState("");
  const [editEmailAlias, setEditEmailAlias] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);
  const [editContactIds, setEditContactIds] = useState<string[]>([]);
  const [editQuotationIds, setEditQuotationIds] = useState<string[]>([]);
  const [editOrderIds, setEditOrderIds] = useState<string[]>([]);

  const [isPending, startTransition] = useTransition();

  async function reloadTeams() {
    startTransition(async () => {
      try {
        const data = await getSalesTeams();
        setTeams(data);
      } catch {
        toast.error("Failed to load Sales Teams");
      }
    });
  }

  function applyPreset(preset: typeof EXAMPLE_PRESETS[number]) {
    setName(preset.name);
    setRegion(preset.region);
    setProductLine(preset.productLine);
    setTargetQuota(preset.targetQuota);
    setEmailAlias(preset.emailAlias);
    setNotes(preset.notes);
    toast.info(`Preset applied: ${preset.name}`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;

    startTransition(async () => {
      try {
        await createSalesTeam({
          name,
          leaderId: leaderId || null,
          region,
          productLine,
          targetQuota: parseFloat(targetQuota) || 0,
          emailAlias,
          notes,
          memberIds: selectedMemberIds,
          contactIds: selectedContactIds,
          quotationIds: selectedQuotationIds,
          orderIds: selectedOrderIds,
        });
        toast.success("Sales Team created successfully!");
        setIsOpen(false);
        resetCreateForm();
        reloadTeams();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create Sales Team");
      }
    });
  }

  function resetCreateForm() {
    setName("");
    setLeaderId("");
    setRegion("");
    setProductLine("");
    setTargetQuota("");
    setEmailAlias("");
    setNotes("");
    setSelectedMemberIds([]);
    setSelectedContactIds([]);
    setSelectedQuotationIds([]);
    setSelectedOrderIds([]);
  }

  function openEditModal(team: SalesTeam) {
    setEditTeam(team);
    setEditName(team.name || "");
    setEditLeaderId(team.leaderId || "");
    setEditRegion(team.region || "");
    setEditProductLine(team.productLine || "");
    setEditTargetQuota(String(team.targetQuota || 0));
    setEditEmailAlias(team.emailAlias || "");
    setEditNotes(team.notes || "");
    setEditMemberIds(team.members?.map((m) => m.userId) || []);
    setEditContactIds(team.contacts?.map((c) => c.id) || []);
    setEditQuotationIds(team.quotations?.map((q) => q.id) || []);
    setEditOrderIds(team.orders?.map((o) => o.id) || []);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTeam) return;

    startTransition(async () => {
      try {
        await updateSalesTeam(editTeam.id, {
          name: editName,
          leaderId: editLeaderId || null,
          region: editRegion,
          productLine: editProductLine,
          targetQuota: parseFloat(editTargetQuota) || 0,
          emailAlias: editEmailAlias,
          notes: editNotes,
          memberIds: editMemberIds,
          contactIds: editContactIds,
          quotationIds: editQuotationIds,
          orderIds: editOrderIds,
        });
        toast.success("Sales Team updated successfully!");
        setEditTeam(null);
        reloadTeams();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update team");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteSalesTeam(id);
        toast.success("Sales Team deleted");
        setDeleteConfirmTeam(null);
        reloadTeams();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete team");
      }
    });
  }

  const totalTargetQuota = teams.reduce((acc, t) => acc + t.targetQuota, 0);
  const totalAchievedRevenue = teams.reduce((acc, t) => acc + (t.achievedRevenue || 0), 0);
  const overallProgress = totalTargetQuota > 0 ? Math.min(Math.round((totalAchievedRevenue / totalTargetQuota) * 100), 100) : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize sales units, assign team leaders & salespersons, allocate customers, assign quotes/orders, configure CRM email aliases, and track performance.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetCreateForm(); }}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-4 py-2 text-sm font-medium cursor-pointer transition-colors">
            <Plus className="h-4 w-4" /> Add Sales Team
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-blue-600">
                <Users className="h-5 w-5" /> Create Sales Team
              </DialogTitle>
              <DialogDescription>
                Configure team leadership, salespersons, customer allocations, and email aliases for CRM integration.
              </DialogDescription>
            </DialogHeader>

            {/* Presets Bar */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                <Sparkles className="h-3.5 w-3.5" /> Quick Template Presets:
              </div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-blue-200"
                    onClick={() => applyPreset(preset)}
                  >
                    + {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="teamName">Team Name *</Label>
                  <Input
                    id="teamName"
                    required
                    placeholder="e.g. North Region Sales Team"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leader">Assign Team Leader</Label>
                  <select
                    id="leader"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={leaderId}
                    onChange={(e) => setLeaderId(e.target.value)}
                  >
                    <option value="">-- Select Team Leader --</option>
                    {formData.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailAlias" className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-blue-600" /> Configured Email Alias (CRM Integration)
                  </Label>
                  <Input
                    id="emailAlias"
                    placeholder="e.g. north-sales@tixeltech.com"
                    value={emailAlias}
                    onChange={(e) => setEmailAlias(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Region / Territory</Label>
                  <Input
                    id="region"
                    placeholder="e.g. North India"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productLine">Product Line</Label>
                  <Input
                    id="productLine"
                    placeholder="e.g. Enterprise SaaS & Software"
                    value={productLine}
                    onChange={(e) => setProductLine(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="targetQuota">Quarterly Target Quota (₹)</Label>
                  <Input
                    id="targetQuota"
                    type="number"
                    placeholder="e.g. 5000000"
                    value={targetQuota}
                    onChange={(e) => setTargetQuota(e.target.value)}
                  />
                </div>
              </div>

              {/* Assign Salespersons (Members) */}
              <div className="space-y-2 border-t pt-3">
                <Label className="flex items-center gap-1 font-semibold text-sm">
                  <UserCheck className="h-4 w-4 text-emerald-600" /> Assign Salespersons / Team Members ({selectedMemberIds.length} selected)
                </Label>
                <div className="max-h-36 overflow-y-auto border rounded-md p-2 space-y-1 bg-muted/20">
                  {formData.users.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">No users available</p>
                  ) : (
                    formData.users.map((u) => {
                      const isChecked = selectedMemberIds.includes(u.id);
                      return (
                        <label key={u.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedMemberIds([...selectedMemberIds, u.id]);
                              else setSelectedMemberIds(selectedMemberIds.filter((id) => id !== u.id));
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{u.name || u.email}</span>
                          <span className="text-muted-foreground">({u.email})</span>
                          {u.id === leaderId && <Badge variant="outline" className="ml-auto text-[10px] bg-amber-50 text-amber-700 border-amber-300">Leader</Badge>}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Allocate Customers */}
              <div className="space-y-2 border-t pt-3">
                <Label className="flex items-center gap-1 font-semibold text-sm">
                  <Building2 className="h-4 w-4 text-purple-600" /> Allocate Customers ({selectedContactIds.length} selected)
                </Label>
                <div className="max-h-36 overflow-y-auto border rounded-md p-2 space-y-1 bg-muted/20">
                  {formData.contacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">No customer contacts found in workspace</p>
                  ) : (
                    formData.contacts.map((c) => {
                      const isChecked = selectedContactIds.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedContactIds([...selectedContactIds, c.id]);
                              else setSelectedContactIds(selectedContactIds.filter((id) => id !== c.id));
                            }}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                          {c.email && <span className="text-muted-foreground">({c.email})</span>}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Assign Quotations & Orders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 font-semibold text-xs">
                    <FileText className="h-3.5 w-3.5 text-blue-600" /> Assign Quotations ({selectedQuotationIds.length})
                  </Label>
                  <div className="max-h-28 overflow-y-auto border rounded-md p-2 space-y-1 bg-muted/20">
                    {formData.quotations.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-1 text-center">No quotations</p>
                    ) : (
                      formData.quotations.map((q) => (
                        <label key={q.id} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-slate-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedQuotationIds.includes(q.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedQuotationIds([...selectedQuotationIds, q.id]);
                              else setSelectedQuotationIds(selectedQuotationIds.filter((id) => id !== q.id));
                            }}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span>{q.quotationNo}</span>
                          <span className="ml-auto font-mono text-emerald-600 font-semibold">{formatINR(q.total)}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1 font-semibold text-xs">
                    <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" /> Assign Sales Orders ({selectedOrderIds.length})
                  </Label>
                  <div className="max-h-28 overflow-y-auto border rounded-md p-2 space-y-1 bg-muted/20">
                    {formData.orders.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-1 text-center">No orders</p>
                    ) : (
                      formData.orders.map((o) => (
                        <label key={o.id} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-slate-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(o.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedOrderIds([...selectedOrderIds, o.id]);
                              else setSelectedOrderIds(selectedOrderIds.filter((id) => id !== o.id));
                            }}
                            className="rounded border-slate-300 text-emerald-600"
                          />
                          <span>{o.orderNo}</span>
                          <span className="ml-auto font-mono text-emerald-600 font-semibold">{formatINR(o.total)}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <Label htmlFor="notes">Team Description / Objectives</Label>
                <Textarea
                  id="notes"
                  placeholder="Responsibilities, targets, and strategic goals..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Team
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sales Teams</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Organized sales units</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Combined Quota Target</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(totalTargetQuota)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total revenue target</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Achieved Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatINR(totalAchievedRevenue)}</div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">{overallProgress}% Quota Achieved</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CRM Email Integration</CardTitle>
            <Mail className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {teams.filter((t) => t.emailAlias).length} / {teams.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Teams with active email alias</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Sales Teams Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" /> All Sales Teams & Allocations
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Team & Email Alias</TableHead>
                <TableHead>Leader & Members</TableHead>
                <TableHead>Region & Product Line</TableHead>
                <TableHead>Allocations</TableHead>
                <TableHead className="text-right">Target vs Achieved</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <div className="space-y-2">
                      <p className="font-semibold text-base">No sales teams found</p>
                      <p className="text-xs">Click &quot;Add Sales Team&quot; or use a template preset to organize your sales force.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => {
                  const achieved = team.achievedRevenue || 0;
                  const progress = team.quotaProgress || 0;

                  return (
                    <TableRow key={team.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono font-bold text-blue-600">{team.code}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {team.name}
                          </div>
                          {team.emailAlias ? (
                            <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-800 border-amber-200 text-[11px]">
                              <Mail className="h-3 w-3 text-amber-600" /> {team.emailAlias}
                              <span className="inline-flex items-center px-1 rounded text-[9px] bg-emerald-100 text-emerald-800 font-medium">CRM</span>
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">No alias configured</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {team.leader ? (
                            <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                              <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-600" />
                              {team.leader.name || team.leader.email}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No leader assigned</span>
                          )}
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-blue-600" /> {team.members?.length || 0} Salesperson(s)
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="gap-1 bg-slate-50 text-xs">
                            <MapPin className="h-3 w-3 text-purple-600" /> {team.region || "General"}
                          </Badge>
                          <div>
                            <Badge variant="outline" className="gap-1 bg-slate-50 text-xs">
                              <Briefcase className="h-3 w-3 text-blue-600" /> {team.productLine || "All"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300">
                            <Building2 className="h-3.5 w-3.5" /> {team.contacts?.length || 0} Customer(s)
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                            <span>Quotes: {team.quotations?.length || 0}</span>
                            <span>•</span>
                            <span>Orders: {team.orders?.length || 0}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{formatINR(team.targetQuota)}</div>
                          <div className="text-xs font-semibold text-emerald-600 flex items-center justify-end gap-1">
                            {formatINR(achieved)} ({progress}%)
                          </div>
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 ml-auto">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewTeam(team)}
                            title="View Full Details"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(team)}
                            title="Edit Team"
                            className="h-8 w-8 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmTeam(team)}
                            disabled={isPending}
                            title="Delete Team"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* VIEW TEAM DETAIL DIALOG WITH TABS */}
      {viewTeam && (
        <Dialog open={!!viewTeam} onOpenChange={(open) => { if (!open) setViewTeam(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                <Users className="h-6 w-6" /> {viewTeam.name} ({viewTeam.code})
              </DialogTitle>
              <DialogDescription>
                Region: <span className="font-semibold text-slate-800 dark:text-slate-200">{viewTeam.region || "General"}</span> • Product Line: <span className="font-semibold text-slate-800 dark:text-slate-200">{viewTeam.productLine || "All"}</span>
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="overview" className="w-full pt-2">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="members" className="text-xs">Salespersons</TabsTrigger>
                <TabsTrigger value="customers" className="text-xs">Customers</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs">Quotes/Orders</TabsTrigger>
                <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 bg-blue-50/30 space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Leadership</span>
                    {viewTeam.leader ? (
                      <div className="flex items-center gap-2 pt-1">
                        <Crown className="h-5 w-5 text-amber-500 fill-amber-400" />
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{viewTeam.leader.name || viewTeam.leader.email}</div>
                          <div className="text-xs text-muted-foreground">{viewTeam.leader.email}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic pt-1">No leader assigned</p>
                    )}
                  </div>

                  <div className="rounded-lg border p-4 bg-amber-50/30 space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CRM Email Alias</span>
                    {viewTeam.emailAlias ? (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-amber-900 dark:text-amber-300">
                          <Mail className="h-4 w-4 text-amber-600" /> {viewTeam.emailAlias}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-amber-700"
                            onClick={() => {
                              navigator.clipboard.writeText(viewTeam.emailAlias!);
                              toast.success("Email alias copied!");
                            }}
                            title="Copy email alias"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> CRM Auto-Forwarding Active
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic pt-1">No email alias configured</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium text-muted-foreground">Target Quota:</span>
                    <span className="font-mono font-bold text-purple-600 text-base">{formatINR(viewTeam.targetQuota)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium text-muted-foreground">Achieved Revenue:</span>
                    <span className="font-mono font-bold text-emerald-600 text-base">{formatINR(viewTeam.achievedRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Quota Progress:</span>
                    <Badge variant="outline" className="font-bold bg-emerald-50 text-emerald-700 border-emerald-300">
                      {viewTeam.quotaProgress}%
                    </Badge>
                  </div>
                </div>

                {viewTeam.notes && (
                  <div className="text-xs space-y-1 border-t pt-2">
                    <span className="font-semibold text-muted-foreground">Team Description & Strategic Goals:</span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded border">{viewTeam.notes}</p>
                  </div>
                )}
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-3 pt-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-800">Assigned Salespersons ({viewTeam.members?.length || 0})</h4>
                </div>
                {(!viewTeam.members || viewTeam.members.length === 0) ? (
                  <p className="text-xs text-muted-foreground py-6 text-center border rounded-md">No salespersons assigned to this team.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {viewTeam.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2.5 rounded-md border bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {m.user?.name?.[0] || "U"}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{m.user?.name || m.user?.email}</div>
                            <div className="text-[11px] text-muted-foreground">{m.user?.email}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className={m.userId === viewTeam.leaderId ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-slate-100"}>
                          {m.userId === viewTeam.leaderId ? "Team Leader" : "Salesperson"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Customers Tab */}
              <TabsContent value="customers" className="space-y-3 pt-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-800">Allocated Customers ({viewTeam.contacts?.length || 0})</h4>
                </div>
                {(!viewTeam.contacts || viewTeam.contacts.length === 0) ? (
                  <p className="text-xs text-muted-foreground py-6 text-center border rounded-md">No customers allocated to this team.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {viewTeam.contacts.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-2.5 rounded-md border bg-slate-50 dark:bg-slate-900">
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {c.firstName} {c.lastName}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {c.company && <span className="font-medium text-slate-700 dark:text-slate-300 mr-2">{c.company}</span>}
                            {c.email} {c.phone && `• ${c.phone}`}
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                          Allocated
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Quotes & Orders Tab */}
              <TabsContent value="documents" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h5 className="font-bold text-xs text-blue-700">Quotations ({viewTeam.quotations?.length || 0})</h5>
                    {(!viewTeam.quotations || viewTeam.quotations.length === 0) ? (
                      <p className="text-[11px] text-muted-foreground py-3 text-center border rounded">No quotations</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {viewTeam.quotations.map((q) => (
                          <div key={q.id} className="p-2 border rounded text-xs flex justify-between items-center bg-slate-50">
                            <div>
                              <span className="font-mono font-bold text-blue-600">{q.quotationNo}</span>
                              <Badge variant="outline" className="ml-1.5 text-[9px]">{q.status}</Badge>
                            </div>
                            <span className="font-mono font-semibold text-emerald-600">{formatINR(q.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-xs text-emerald-700">Sales Orders ({viewTeam.orders?.length || 0})</h5>
                    {(!viewTeam.orders || viewTeam.orders.length === 0) ? (
                      <p className="text-[11px] text-muted-foreground py-3 text-center border rounded">No orders</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {viewTeam.orders.map((o) => (
                          <div key={o.id} className="p-2 border rounded text-xs flex justify-between items-center bg-slate-50">
                            <div>
                              <span className="font-mono font-bold text-emerald-700">{o.orderNo}</span>
                              <Badge variant="outline" className="ml-1.5 text-[9px]">{o.status}</Badge>
                            </div>
                            <span className="font-mono font-semibold text-emerald-600">{formatINR(o.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-4 pt-3">
                <div className="rounded-lg border p-4 bg-emerald-50/30 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-800">Target vs Revenue Performance</span>
                    <span className="font-bold text-emerald-600 text-lg">{viewTeam.quotaProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${viewTeam.quotaProgress}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                    <div className="p-2 border rounded bg-white">
                      <span className="text-muted-foreground">Quarterly Quota Target:</span>
                      <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">{formatINR(viewTeam.targetQuota)}</div>
                    </div>
                    <div className="p-2 border rounded bg-white">
                      <span className="text-muted-foreground">Revenue Achieved:</span>
                      <div className="font-mono font-bold text-emerald-600 text-sm mt-0.5">{formatINR(viewTeam.achievedRevenue || 0)}</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-4 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                Close
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT TEAM DIALOG */}
      {editTeam && (
        <Dialog open={!!editTeam} onOpenChange={(open) => { if (!open) setEditTeam(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-600" /> Edit Sales Team ({editTeam.code})
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleEdit} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="editName">Team Name *</Label>
                  <Input
                    id="editName"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editLeader">Team Leader</Label>
                  <select
                    id="editLeader"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={editLeaderId}
                    onChange={(e) => setEditLeaderId(e.target.value)}
                  >
                    <option value="">-- Select Team Leader --</option>
                    {formData.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editEmailAlias" className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-blue-600" /> Configured Email Alias
                  </Label>
                  <Input
                    id="editEmailAlias"
                    value={editEmailAlias}
                    onChange={(e) => setEditEmailAlias(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editRegion">Region / Territory</Label>
                  <Input
                    id="editRegion"
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editProductLine">Product Line</Label>
                  <Input
                    id="editProductLine"
                    value={editProductLine}
                    onChange={(e) => setEditProductLine(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="editTargetQuota">Quarterly Target Quota (₹)</Label>
                  <Input
                    id="editTargetQuota"
                    type="number"
                    value={editTargetQuota}
                    onChange={(e) => setEditTargetQuota(e.target.value)}
                  />
                </div>
              </div>

              {/* Edit Salespersons */}
              <div className="space-y-2 border-t pt-3">
                <Label className="flex items-center gap-1 font-semibold text-sm">
                  <UserCheck className="h-4 w-4 text-emerald-600" /> Salespersons / Team Members ({editMemberIds.length} selected)
                </Label>
                <div className="max-h-36 overflow-y-auto border rounded-md p-2 space-y-1 bg-muted/20">
                  {formData.users.map((u) => {
                    const isChecked = editMemberIds.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-slate-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setEditMemberIds([...editMemberIds, u.id]);
                            else setEditMemberIds(editMemberIds.filter((id) => id !== u.id));
                          }}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span className="font-medium">{u.name || u.email}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Edit Allocated Customers */}
              <div className="space-y-2 border-t pt-3">
                <Label className="flex items-center gap-1 font-semibold text-sm">
                  <Building2 className="h-4 w-4 text-purple-600" /> Allocated Customers ({editContactIds.length} selected)
                </Label>
                <div className="max-h-36 overflow-y-auto border rounded-md p-2 space-y-1 bg-muted/20">
                  {formData.contacts.map((c) => {
                    const isChecked = editContactIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-slate-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setEditContactIds([...editContactIds, c.id]);
                            else setEditContactIds(editContactIds.filter((id) => id !== c.id));
                          }}
                          className="rounded border-slate-300 text-purple-600"
                        />
                        <span className="font-medium">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <Label htmlFor="editNotes">Team Description / Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmTeam && (
        <Dialog open={!!deleteConfirmTeam} onOpenChange={(open) => { if (!open) setDeleteConfirmTeam(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Delete Sales Team
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground pt-1">
              Are you sure you want to delete <span className="font-semibold text-slate-800">{deleteConfirmTeam.name}</span> ({deleteConfirmTeam.code})?
            </p>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmTeam && handleDelete(deleteConfirmTeam.id)}
                disabled={isPending}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
