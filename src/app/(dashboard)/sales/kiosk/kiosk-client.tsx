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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Monitor,
  Plus,
  Loader2,
  QrCode,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Pencil,
  MapPin,
  Store,
} from "lucide-react";
import {
  getKiosks,
  createKiosk,
  updateKiosk,
  deleteKiosk,
  generatePairingCode,
} from "@/lib/actions/sales";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Kiosk = {
  id: string;
  name: string;
  outletName: string | null;
  location: string | null;
  terminalOS: string | null;
  ipAddress: string | null;
  status: string;
  pairingCode: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  ONLINE: "bg-green-100 text-green-700",
  OFFLINE: "bg-gray-100 text-gray-600",
  MAINTENANCE: "bg-yellow-100 text-yellow-700",
};

const statusIcons: Record<string, React.ReactNode> = {
  ONLINE: <Wifi className="h-3.5 w-3.5" />,
  OFFLINE: <WifiOff className="h-3.5 w-3.5" />,
  MAINTENANCE: <AlertTriangle className="h-3.5 w-3.5" />,
};

const osOptions = ["Android", "iOS", "Windows"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KioskClient({
  initialData,
}: {
  initialData: Kiosk[];
}) {
  const [kiosks, setKiosks] = useState<Kiosk[]>(initialData);
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formOutlet, setFormOutlet] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formOS, setFormOS] = useState("");
  const [formIp, setFormIp] = useState("");
  const [formStatus, setFormStatus] = useState("OFFLINE");

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  // ---------------------------------------------------------------------------
  // Data refresh
  // ---------------------------------------------------------------------------

  async function refresh() {
    try {
      const data = await getKiosks();
      setKiosks(data.map((k: any) => ({
        ...k,
        createdAt: k.createdAt instanceof Date ? k.createdAt.toISOString() : k.createdAt,
        updatedAt: k.updatedAt instanceof Date ? k.updatedAt.toISOString() : k.updatedAt,
        pairedAt: k.pairedAt instanceof Date ? k.pairedAt.toISOString() : k.pairedAt,
        lastSeenAt: k.lastSeenAt instanceof Date ? k.lastSeenAt.toISOString() : k.lastSeenAt,
      })) as Kiosk[]);
    } catch {
      // silent
    }
  }

  // ---------------------------------------------------------------------------
  // Dialog handlers
  // ---------------------------------------------------------------------------

  function openCreate() {
    setEditingId(null);
    setFormName("");
    setFormOutlet("");
    setFormLocation("");
    setFormOS("");
    setFormIp("");
    setFormStatus("OFFLINE");
    setDialogOpen(true);
  }

  function openEdit(kiosk: Kiosk) {
    setEditingId(kiosk.id);
    setFormName(kiosk.name);
    setFormOutlet(kiosk.outletName || "");
    setFormLocation(kiosk.location || "");
    setFormOS(kiosk.terminalOS || "");
    setFormIp(kiosk.ipAddress || "");
    setFormStatus(kiosk.status);
    setDialogOpen(true);
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  function handleSave() {
    if (!formName.trim()) {
      toast.error("Kiosk name is required");
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateKiosk(editingId, {
            name: formName.trim(),
            outletName: formOutlet.trim() || undefined,
            location: formLocation.trim() || undefined,
            terminalOS: formOS || undefined,
            ipAddress: formIp.trim() || undefined,
            status: formStatus,
          });
          toast.success("Kiosk updated");
        } else {
          await createKiosk({
            name: formName.trim(),
            outletName: formOutlet.trim() || undefined,
            location: formLocation.trim() || undefined,
            terminalOS: formOS || undefined,
            ipAddress: formIp.trim() || undefined,
            status: formStatus,
          });
          toast.success("Kiosk created");
        }
        setDialogOpen(false);
        await refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save kiosk"
        );
      }
    });
  }

  function handleDelete() {
    if (!deleteId) return;

    startTransition(async () => {
      try {
        await deleteKiosk(deleteId);
        toast.success("Kiosk deleted");
        setDeleteId(null);
        await refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete kiosk"
        );
      }
    });
  }

  function handlePair(id: string) {
    startTransition(async () => {
      try {
        const code = await generatePairingCode(id);
        toast.success(`Pairing code: ${code}`);
        await refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to generate pairing code"
        );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const onlineCount = kiosks.filter((k) => k.status === "ONLINE").length;
  const offlineCount = kiosks.filter((k) => k.status === "OFFLINE").length;
  const maintenanceCount = kiosks.filter((k) => k.status === "MAINTENANCE").length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Kiosk Management</h1>
            <p className="text-xs text-muted-foreground">
              Manage self-service kiosk terminals
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isPending}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button onClick={openCreate} />}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Kiosk
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Kiosk" : "New Kiosk"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="k-name" className="mb-1.5 text-xs">
                    Name *
                  </Label>
                  <Input
                    id="k-name"
                    placeholder="e.g. Entrance Kiosk 1"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="k-outlet" className="mb-1.5 text-xs">
                    Outlet
                  </Label>
                  <Input
                    id="k-outlet"
                    placeholder="e.g. Food Court"
                    value={formOutlet}
                    onChange={(e) => setFormOutlet(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="k-location" className="mb-1.5 text-xs">
                    Location
                  </Label>
                  <Input
                    id="k-location"
                    placeholder="e.g. 1st Floor, Near Elevator"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="k-os" className="mb-1.5 text-xs">
                      Terminal OS
                    </Label>
                    <Select value={formOS} onValueChange={(v) => v && setFormOS(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select OS" />
                      </SelectTrigger>
                      <SelectContent>
                        {osOptions.map((os) => (
                          <SelectItem key={os} value={os}>
                            {os}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="k-status" className="mb-1.5 text-xs">
                      Status
                    </Label>
                    <Select value={formStatus} onValueChange={(v) => v && setFormStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONLINE">Online</SelectItem>
                        <SelectItem value="OFFLINE">Offline</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="k-ip" className="mb-1.5 text-xs">
                    IP Address
                  </Label>
                  <Input
                    id="k-ip"
                    placeholder="e.g. 192.168.1.100"
                    value={formIp}
                    onChange={(e) => setFormIp(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button onClick={handleSave} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kiosks.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Wifi className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{onlineCount}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <WifiOff className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{offlineCount}</p>
              <p className="text-xs text-muted-foreground">Offline</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{maintenanceCount}</p>
              <p className="text-xs text-muted-foreground">Maintenance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kiosks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4" />
            All Kiosk Terminals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kiosks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Monitor className="mb-3 h-12 w-12 opacity-20" />
              <p className="text-sm">No kiosk terminals configured</p>
              <p className="text-xs">
                Click &quot;Add Kiosk&quot; to set up your first terminal
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pairing Code</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kiosks.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {k.outletName ? (
                        <span className="flex items-center gap-1">
                          <Store className="h-3.5 w-3.5" />
                          {k.outletName}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {k.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {k.location}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{k.terminalOS || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {k.ipAddress || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[k.status] || ""}
                      >
                        <span className="mr-1">{statusIcons[k.status]}</span>
                        {k.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {k.pairingCode ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                          {k.pairingCode}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Not paired
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(k.lastSeenAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handlePair(k.id)}
                          disabled={isPending}
                        >
                          <QrCode className="mr-1 h-3.5 w-3.5" />
                          Pair
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => openEdit(k)}
                          disabled={isPending}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-red-600"
                          onClick={() => {
                            setDeleteId(k.id);
                            setDeleteName(k.name);
                          }}
                          disabled={isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Kiosk?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{deleteName}&quot;? This action
            cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
