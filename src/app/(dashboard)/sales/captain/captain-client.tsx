"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bike,
  MapPin,
  Phone,
  Star,
  Clock,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Circle,
  UserCheck,
} from "lucide-react";
import {
  getCaptains,
  getCaptainDeliveries,
  getAllDeliveries,
  updateCaptainStatus,
  assignCaptainToDelivery,
} from "@/lib/actions/sales";
import { toast } from "sonner";

type Captain = Awaited<ReturnType<typeof getCaptains>>[number];
type Delivery = Awaited<ReturnType<typeof getAllDeliveries>>[number];

const STATUS_BADGES: Record<string, string> = {
  ONLINE: "bg-emerald-100 text-emerald-700 border-emerald-300",
  OFFLINE: "bg-gray-100 text-gray-700 border-gray-300",
  ON_DELIVERY: "bg-blue-100 text-blue-700 border-blue-300",
};

const DELIVERY_STATUS_BADGES: Record<string, string> = {
  ASSIGNED: "bg-amber-100 text-amber-700 border-amber-300",
  PICKED_UP: "bg-blue-100 text-blue-700 border-blue-300",
  IN_TRANSIT: "bg-purple-100 text-purple-700 border-purple-300",
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

function formatINR(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

type Props = {
  initialCaptains: Captain[];
  initialDeliveries: Delivery[];
};

export function CaptainClient({ initialCaptains, initialDeliveries }: Props) {
  const [captains, setCaptains] = useState<Captain[]>(initialCaptains);
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [selectedCaptain, setSelectedCaptain] = useState<Captain | null>(null);
  const [selectedCaptainDeliveries, setSelectedCaptainDeliveries] = useState<Delivery[]>([]);
  const [activeTab, setActiveTab] = useState<"captains" | "deliveries">("captains");
  const [isPending, startTransition] = useTransition();

  function handleSelectCaptain(captain: Captain) {
    setSelectedCaptain(captain);
    startTransition(async () => {
      try {
        const d = await getCaptainDeliveries(captain.id);
        setSelectedCaptainDeliveries(d);
      } catch {
        setSelectedCaptainDeliveries([]);
      }
    });
  }

  function handleStatusChange(captainId: string, status: string) {
    startTransition(async () => {
      try {
        await updateCaptainStatus(captainId, status);
        const updated = await getCaptains();
        setCaptains(updated);
        const updatedCaptain = updated.find((c) => c.id === captainId) ?? null;
        setSelectedCaptain(updatedCaptain);
        toast.success("Captain status updated");
      } catch {
        toast.error("Failed to update status");
      }
    });
  }

  function handleAssignDelivery(deliveryId: string, captainId: string) {
    startTransition(async () => {
      try {
        await assignCaptainToDelivery(deliveryId, captainId);
        const [updatedCaptains, updatedDeliveries] = await Promise.all([
          getCaptains(),
          getAllDeliveries(),
        ]);
        setCaptains(updatedCaptains);
        setDeliveries(updatedDeliveries);
        if (selectedCaptain) {
          const d = await getCaptainDeliveries(selectedCaptain.id);
          setSelectedCaptainDeliveries(d);
        }
        toast.success("Captain assigned to delivery");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Assignment failed");
      }
    });
  }

  const availableCaptains = captains.filter((c) => c.status === "ONLINE");
  const unassignedDeliveries = deliveries.filter((d) => !d.captainId || d.status === "ASSIGNED");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Captain Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage delivery captains, track active deliveries, and assign orders.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Online Captains</div>
            <div className="text-2xl font-bold">{captains.filter((c) => c.status === "ONLINE").length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">On Delivery</div>
            <div className="text-2xl font-bold">{captains.filter((c) => c.status === "ON_DELIVERY").length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-600">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Active Deliveries</div>
            <div className="text-2xl font-bold">{deliveries.filter((d) => d.status !== "DELIVERED").length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-600">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Avg Rating</div>
            <div className="text-2xl font-bold">
              {(captains.reduce((s, c) => s + c.rating, 0) / (captains.length || 1)).toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "captains" ? "default" : "ghost"}
          size="sm"
          className={activeTab === "captains" ? "bg-blue-600 hover:bg-blue-700" : ""}
          onClick={() => setActiveTab("captains")}
        >
          Captains List
        </Button>
        <Button
          variant={activeTab === "deliveries" ? "default" : "ghost"}
          size="sm"
          className={activeTab === "deliveries" ? "bg-blue-600 hover:bg-blue-700" : ""}
          onClick={() => setActiveTab("deliveries")}
        >
          Active Deliveries
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {activeTab === "captains" ? (
                <>
                  <Bike className="h-4 w-4 text-blue-600" /> Captains List
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Active Deliveries
                </>
              )}
            </CardTitle>
            <CardDescription>
              {activeTab === "captains"
                ? `${captains.length} captains registered`
                : `${deliveries.length} total deliveries`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeTab === "captains" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Deliveries</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {captains.map((captain) => (
                    <TableRow
                      key={captain.id}
                      className={selectedCaptain?.id === captain.id ? "bg-muted/50" : ""}
                    >
                      <TableCell className="font-medium">
                        <button
                          onClick={() => handleSelectCaptain(captain)}
                          className="text-blue-600 hover:underline text-left"
                        >
                          <div>{captain.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {captain.phone}
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">
                        {captain.vehicle}
                        <div className="text-xs text-muted-foreground">{captain.vehicleNumber}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          <span className="text-sm font-semibold">{captain.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {captain.totalDeliveries}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGES[captain.status] ?? ""} variant="outline">
                          {captain.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={captain.status}
                          onValueChange={(status) => {
                            if (status) handleStatusChange(captain.id, status);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ONLINE">Online</SelectItem>
                            <SelectItem value="OFFLINE">Offline</SelectItem>
                            <SelectItem value="ON_DELIVERY">On Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="space-y-3">
                {deliveries.map((delivery) => {
                  const assignedCaptain = captains.find((c) => c.id === delivery.captainId);
                  return (
                    <div key={delivery.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{delivery.orderNo}</span>
                            <Badge
                              className={DELIVERY_STATUS_BADGES[delivery.status] ?? ""}
                              variant="outline"
                            >
                              {delivery.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mt-1">{delivery.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatINR(delivery.amount)}
                          </p>
                        </div>
                        <div className="text-right">
                          {delivery.captainId ? (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Captain: </span>
                              <span className="font-semibold">{assignedCaptain?.name ?? "N/A"}</span>
                            </div>
                          ) : (
                            <Select
                              onValueChange={(captainId) =>
                                handleAssignDelivery(delivery.id, captainId)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs w-36">
                                <SelectValue placeholder="Assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCaptains.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>

                      {/* Timeline */}
                      {delivery.timeline.length > 0 && (
                        <div className="mt-3 pt-3 border-t space-y-1">
                          {delivery.timeline.map((t, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                              {idx === delivery.timeline.length - 1 ? (
                                <Circle className="h-2 w-2 fill-blue-600 text-blue-600" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              )}
                              <span>{t.status}</span>
                              <span className="text-muted-foreground/60">
                                {new Date(t.time).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side Panel: Selected Captain Detail */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-600" />
              Captain Detail
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCaptain ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold">{selectedCaptain.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {selectedCaptain.phone}
                  </p>
                  <Badge
                    className={`mt-1 ${STATUS_BADGES[selectedCaptain.status] ?? ""}`}
                    variant="outline"
                  >
                    {selectedCaptain.status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">Vehicle</div>
                    <div className="text-sm font-semibold">{selectedCaptain.vehicle}</div>
                    <div className="text-xs text-muted-foreground">{selectedCaptain.vehicleNumber}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">Rating</div>
                    <div className="text-sm font-semibold flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {selectedCaptain.rating}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="text-lg font-bold text-emerald-600">
                    {formatINR(selectedCaptain.totalEarnings)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total Earnings ({selectedCaptain.totalDeliveries} deliveries)
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min((selectedCaptain.totalDeliveries / 500) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="p-3 rounded-lg border">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <MapPin className="h-3.5 w-3.5 text-red-500" />
                    Current Location
                  </div>
                  <p className="text-sm">{selectedCaptain.currentAddress}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedCaptain.latitude.toFixed(4)}, {selectedCaptain.longitude.toFixed(4)}
                  </p>
                </div>

                {/* Assigned Deliveries */}
                {selectedCaptainDeliveries.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Assigned Deliveries
                    </p>
                    <div className="space-y-2">
                      {selectedCaptainDeliveries.map((d) => (
                        <div key={d.id} className="text-sm p-2 border rounded">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{d.orderNo}</span>
                            <Badge
                              className={DELIVERY_STATUS_BADGES[d.status] ?? ""}
                              variant="outline"
                            >
                              {d.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{d.customerName}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Click a captain to view details, earnings, and location.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
