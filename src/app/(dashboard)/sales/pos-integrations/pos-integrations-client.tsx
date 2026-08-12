"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Globe,
  Link2,
  RefreshCw,
  Download,
  Shield,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Clock,
  ExternalLink,
  Key,
  Webhook,
} from "lucide-react";
import {
  getPOSIntegrations,
  savePOSIntegration,
  syncPOSOrders,
  getPOSOrders,
} from "@/lib/actions/sales";
import { toast } from "sonner";

type Integration = Awaited<ReturnType<typeof getPOSIntegrations>>[number];
type POSOrder = Awaited<ReturnType<typeof getPOSOrders>>[number];

const PLATFORM_ICONS: Record<string, string> = {
  Zomato: "bg-red-100 text-red-700 border-red-300",
  Swiggy: "bg-orange-100 text-orange-700 border-orange-300",
  EatSure: "bg-blue-100 text-blue-700 border-blue-300",
  Magicpin: "bg-purple-100 text-purple-700 border-purple-300",
};

const ORDER_STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-300",
  ACCEPTED: "bg-blue-100 text-blue-700 border-blue-300",
  PREPARING: "bg-purple-100 text-purple-700 border-purple-300",
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 border-red-300",
};

function formatINR(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

type Props = {
  initialIntegrations: Integration[];
  initialOrders: POSOrder[];
};

export function POSIntegrationsClient({ initialIntegrations, initialOrders }: Props) {
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);
  const [orders, setOrders] = useState<POSOrder[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<"integrations" | "orders">("integrations");

  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const [configPlatform, setConfigPlatform] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const [isPending, startTransition] = useTransition();

  function handleConfigure(platform: string) {
    setConfigPlatform(platform);
    setApiKey("");
    setIsConfigureOpen(true);
  }

  function handleSaveConfig() {
    if (!apiKey.trim()) {
      toast.error("API key is required");
      return;
    }
    startTransition(async () => {
      try {
        await savePOSIntegration({ platform: configPlatform, apiKey });
        const updated = await getPOSIntegrations();
        setIntegrations(updated);
        setIsConfigureOpen(false);
        toast.success(`${configPlatform} connected successfully`);
      } catch {
        toast.error("Failed to save configuration");
      }
    });
  }

  function handleSync(platform: string) {
    startTransition(async () => {
      try {
        const res = await syncPOSOrders(platform);
        const updated = await getPOSOrders();
        setOrders(updated);
        toast.success(res.message);
      } catch {
        toast.error("Sync failed");
      }
    });
  }

  function refreshData() {
    startTransition(async () => {
      const [updatedIntegrations, updatedOrders] = await Promise.all([
        getPOSIntegrations(),
        getPOSOrders(),
      ]);
      setIntegrations(updatedIntegrations);
      setOrders(updatedOrders);
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">POS Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect Zomato, Swiggy, and other food delivery platforms for seamless order sync.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={refreshData} disabled={isPending}>
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "integrations" ? "default" : "ghost"}
          size="sm"
          className={activeTab === "integrations" ? "bg-blue-600 hover:bg-blue-700" : ""}
          onClick={() => setActiveTab("integrations")}
        >
          Platforms
        </Button>
        <Button
          variant={activeTab === "orders" ? "default" : "ghost"}
          size="sm"
          className={activeTab === "orders" ? "bg-blue-600 hover:bg-blue-700" : ""}
          onClick={() => setActiveTab("orders")}
        >
          Order Sync Log
        </Button>
      </div>

      {activeTab === "integrations" ? (
        <div className="space-y-6">
          {/* Platform Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => {
              const isConnected = integration.status === "CONNECTED";
              const platformColor = PLATFORM_ICONS[integration.platform] ?? "bg-gray-100 text-gray-700 border-gray-300";
              return (
                <Card
                  key={integration.id}
                  className={`cursor-pointer transition-all ${selectedIntegration?.id === integration.id ? "ring-2 ring-blue-600" : ""}`}
                  onClick={() => setSelectedIntegration(integration)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge className={platformColor} variant="outline">
                          <Globe className="h-3.5 w-3.5" />
                        </Badge>
                        {integration.platform}
                      </CardTitle>
                      {isConnected ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 border-gray-300">
                          <XCircle className="h-3 w-3 mr-1" /> Disconnected
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      {isConnected ? integration.apiKey : "No API key configured"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isConnected && (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <ShoppingBag className="h-3 w-3" /> Items Mapped
                          </span>
                          <span className="font-semibold">{integration.menuItemsMapped}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Last Sync
                          </span>
                          <span className="font-medium">
                            {integration.lastSyncAt
                              ? new Date(integration.lastSyncAt).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Never"}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex gap-2 pt-2">
                      {!isConnected ? (
                        <Button
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfigure(integration.platform);
                          }}
                        >
                          <Link2 className="h-3.5 w-3.5" /> Connect
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSync(integration.platform);
                            }}
                            disabled={isPending}
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                            Sync
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfigure(integration.platform);
                            }}
                          >
                            <Key className="h-3.5 w-3.5" /> Config
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Selected Integration Detail */}
          {selectedIntegration && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  {selectedIntegration.platform} Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">API Key</Label>
                    <div className="p-3 bg-muted/30 rounded-lg text-sm font-mono">
                      {selectedIntegration.apiKey || "Not configured"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                    <div className="p-3 bg-muted/30 rounded-lg text-sm font-mono text-blue-600 break-all">
                      {selectedIntegration.webhookUrl}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Menu Mapping</Label>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-bold">{selectedIntegration.menuItemsMapped}</div>
                      <p className="text-xs text-muted-foreground">items mapped</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Orders Sync Log */
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
              Incoming Orders from Platforms
            </CardTitle>
            <CardDescription>{orders.length} orders synced</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Synced At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Badge
                        className={PLATFORM_ICONS[order.platform] ?? ""}
                        variant="outline"
                      >
                        {order.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {order.externalOrderId}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {order.customerName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.items.join(", ")}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {formatINR(order.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={ORDER_STATUS_BADGES[order.status] ?? ""}
                        variant="outline"
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(order.syncedAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
