"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Loader2, Target, MapPin, Briefcase, Trash2, Eye, Pencil } from "lucide-react";
import { createSalesTeam, updateSalesTeam, deleteSalesTeam, getSalesTeams } from "@/lib/actions/sales";
import { toast } from "sonner";

type SalesTeam = Awaited<ReturnType<typeof getSalesTeams>>[number];

type Props = {
  initialTeams: SalesTeam[];
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function SalesTeamsClient({ initialTeams }: Props) {
  const [teams, setTeams] = useState<SalesTeam[]>(initialTeams);
  const [isOpen, setIsOpen] = useState(false);
  const [viewTeam, setViewTeam] = useState<SalesTeam | null>(null);
  const [editTeam, setEditTeam] = useState<SalesTeam | null>(null);
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<SalesTeam | null>(null);

  // Create state
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [productLine, setProductLine] = useState("");
  const [targetQuota, setTargetQuota] = useState("");
  const [notes, setNotes] = useState("");

  // Edit state
  const [editName, setEditName] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editProductLine, setEditProductLine] = useState("");
  const [editTargetQuota, setEditTargetQuota] = useState("");
  const [editNotes, setEditNotes] = useState("");

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;

    startTransition(async () => {
      try {
        await createSalesTeam({
          name,
          region,
          productLine,
          targetQuota: parseFloat(targetQuota) || 0,
          notes,
        });
        toast.success("Sales Team created successfully!");
        setIsOpen(false);
        setName("");
        setRegion("");
        setProductLine("");
        setTargetQuota("");
        setNotes("");
        reloadTeams();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create Sales Team");
      }
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTeam) return;

    startTransition(async () => {
      try {
        await updateSalesTeam(editTeam.id, {
          name: editName,
          region: editRegion,
          productLine: editProductLine,
          targetQuota: parseFloat(editTargetQuota) || 0,
          notes: editNotes,
        });
        toast.success("Sales Team updated!");
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your sales force, assign regions & product lines, set quota targets, and monitor team performance.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-4 py-2 text-sm font-medium cursor-pointer transition-colors">
            <Plus className="h-4 w-4" /> Add Sales Team
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Sales Team</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name *</Label>
                <Input
                  id="teamName"
                  required
                  placeholder="e.g. North India Enterprise Sales"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region / Territory</Label>
                  <Input
                    id="region"
                    placeholder="e.g. North Region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productLine">Product Line</Label>
                  <Input
                    id="productLine"
                    placeholder="e.g. SaaS / Hardware"
                    value={productLine}
                    onChange={(e) => setProductLine(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetQuota">Quarterly Target Quota (₹)</Label>
                <Input
                  id="targetQuota"
                  type="number"
                  placeholder="e.g. 5000000"
                  value={targetQuota}
                  onChange={(e) => setTargetQuota(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Team Description / Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Responsibilities and goals..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Team
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales Teams</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active sales units across regions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Combined Quota Target</CardTitle>
            <Target className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(teams.reduce((acc, t) => acc + t.targetQuota, 0))}</div>
            <p className="text-xs text-muted-foreground mt-1">Total revenue target</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Regions Covered</CardTitle>
            <MapPin className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(teams.map((t) => t.region).filter(Boolean)).size}</div>
            <p className="text-xs text-muted-foreground mt-1">Territories assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Teams Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Team Name</TableHead>
                <TableHead>Region / Territory</TableHead>
                <TableHead>Product Line</TableHead>
                <TableHead className="text-right">Target Quota (₹)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No sales teams found. Click &quot;Add Sales Team&quot; to organize your sales force.
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono font-bold text-blue-600">{team.code}</TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 bg-slate-50">
                        <MapPin className="h-3 w-3 text-purple-600" /> {team.region || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 bg-slate-50">
                        <Briefcase className="h-3 w-3 text-blue-600" /> {team.productLine || "All"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">
                      {formatINR(team.targetQuota)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* VIEW button - Blue */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewTeam(team)}
                          title="View Team Details"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* EDIT button - Black */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditTeam(team);
                            setEditName(team.name || "");
                            setEditRegion(team.region || "");
                            setEditProductLine(team.productLine || "");
                            setEditTargetQuota(String(team.targetQuota || 0));
                            setEditNotes(team.notes || "");
                          }}
                          title="Edit Sales Team"
                          className="h-8 w-8 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* DELETE button - Red */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmTeam(team)}
                          disabled={isPending}
                          title="Delete Sales Team"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* VIEW TEAM DIALOG */}
      {viewTeam && (
        <Dialog open={!!viewTeam} onOpenChange={(open) => { if (!open) setViewTeam(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-600 flex items-center justify-between">
                <span>{viewTeam.name} ({viewTeam.code})</span>
              </DialogTitle>
              <DialogDescription>
                Region: <span className="font-semibold text-slate-800">{viewTeam.region || "General"}</span> • Product Line: <span className="font-semibold text-slate-800">{viewTeam.productLine || "All"}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="rounded-md border p-4 bg-muted/20 space-y-2 text-sm">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground font-medium">Quarterly Target Quota:</span>
                  <span className="font-mono font-bold text-emerald-600 text-base">{formatINR(viewTeam.targetQuota)}</span>
                </div>
                {viewTeam.leader && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground font-medium">Team Leader:</span>
                    <span className="font-semibold text-slate-800">{viewTeam.leader.name || viewTeam.leader.email}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground font-medium">Team Members Count:</span>
                  <Badge variant="outline">{viewTeam.members?.length || 0} Member(s)</Badge>
                </div>
              </div>

              {viewTeam.notes && (
                <div className="text-xs space-y-1 border-t pt-2">
                  <span className="font-semibold text-muted-foreground">Description / Notes:</span>
                  <p className="text-muted-foreground">{viewTeam.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT TEAM DIALOG */}
      {editTeam && (
        <Dialog open={!!editTeam} onOpenChange={(open) => { if (!open) setEditTeam(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Sales Team ({editTeam.code})</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="editName">Team Name *</Label>
                <Input
                  id="editName"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="editTargetQuota">Quarterly Target Quota (₹)</Label>
                <Input
                  id="editTargetQuota"
                  type="number"
                  value={editTargetQuota}
                  onChange={(e) => setEditTargetQuota(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editNotes">Team Description / Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending} className="bg-black text-white hover:bg-black/90">
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
              <DialogTitle>Delete Sales Team</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground pt-1">
              Are you sure you want to delete team <span className="font-semibold text-slate-800">{deleteConfirmTeam.name}</span> ({deleteConfirmTeam.code})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-4">
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
