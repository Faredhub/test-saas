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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Gift,
  PlusCircle,
  ShoppingCart,
  Star,
  Users,
  Award,
} from "lucide-react";
import { getTokenPoints, getPointsHistory, getRewardsCatalog, addPoints, redeemReward } from "@/lib/actions/sales";
import { toast } from "sonner";

type Customer = Awaited<ReturnType<typeof getTokenPoints>>[number];
type Reward = Awaited<ReturnType<typeof getRewardsCatalog>>[number];
type PointsHistoryItem = Awaited<ReturnType<typeof getPointsHistory>>[number];

const TIER_BADGES: Record<string, string> = {
  Bronze: "bg-amber-100 text-amber-700",
  Silver: "bg-gray-100 text-gray-700",
  Gold: "bg-yellow-100 text-yellow-700",
  Platinum: "bg-purple-100 text-purple-700",
};

type Props = {
  initialCustomers: Customer[];
  initialRewards: Reward[];
};

export function TokenPointsClient({ initialCustomers, initialRewards }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [rewards] = useState<Reward[]>(initialRewards);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<PointsHistoryItem[]>([]);
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsNote, setPointsNote] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  const [activeTab, setActiveTab] = useState<"customers" | "rewards" | "history">("customers");
  const [isPending, startTransition] = useTransition();

  function handleSelectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    startTransition(async () => {
      try {
        const h = await getPointsHistory(customer.id);
        setHistory(h);
      } catch {
        setHistory([]);
      }
    });
  }

  function handleAddPoints() {
    if (!selectedCustomer || !pointsAmount || Number(pointsAmount) <= 0) {
      toast.error("Enter a valid point amount");
      return;
    }
    startTransition(async () => {
      try {
        const res = await addPoints(selectedCustomer.id, Number(pointsAmount));
        const updated = await getTokenPoints();
        setCustomers(updated);
        const h = await getPointsHistory(selectedCustomer.id);
        setHistory(h);
        setPointsAmount("");
        setPointsNote("");
        setIsAddOpen(false);
        setSelectedCustomer(res.customer);
        toast.success(`${pointsAmount} points added to ${selectedCustomer.name}`);
      } catch {
        toast.error("Failed to add points");
      }
    });
  }

  function handleRedeemReward() {
    if (!selectedCustomer || !selectedReward) return;
    startTransition(async () => {
      try {
        await redeemReward(selectedCustomer.id, selectedReward.id);
        const updated = await getTokenPoints();
        setCustomers(updated);
        const customer = updated.find((c) => c.id === selectedCustomer.id) ?? null;
        setSelectedCustomer(customer);
        const h = await getPointsHistory(selectedCustomer.id);
        setHistory(h);
        setIsRedeemOpen(false);
        setSelectedReward(null);
        toast.success(`Redeemed: ${selectedReward.name}`);
      } catch {
        toast.error("Failed to redeem reward");
      }
    });
  }

  const tabs = [
    { key: "customers", label: "Customers" },
    { key: "rewards", label: "Rewards Catalog" },
    { key: "history", label: "Points History" },
  ] as const;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Token / Points</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Loyalty program &amp; rewards management for your customers.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "ghost"}
            size="sm"
            className={activeTab === tab.key ? "bg-blue-600 hover:bg-blue-700" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-600" />
              {activeTab === "customers"
                ? "Customer Points"
                : activeTab === "rewards"
                  ? "Rewards Catalog"
                  : "Points History"}
            </CardTitle>
            <CardDescription>
              {activeTab === "customers" && `${customers.length} customers`}
              {activeTab === "rewards" && `${rewards.length} rewards available`}
              {activeTab === "history" && (selectedCustomer ? `History for ${selectedCustomer.name}` : "Select a customer")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeTab === "customers" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className={
                        selectedCustomer?.id === customer.id ? "bg-muted/50" : ""
                      }
                    >
                      <TableCell className="font-medium">
                        <button
                          onClick={() => handleSelectCustomer(customer)}
                          className="text-blue-600 hover:underline text-left"
                        >
                          {customer.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {customer.phone}
                      </TableCell>
                      <TableCell>
                        <Badge className={TIER_BADGES[customer.tier] ?? ""}>
                          {customer.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {customer.points.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsAddOpen(true);
                            }}
                          >
                            <PlusCircle className="h-3.5 w-3.5" /> Add
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsRedeemOpen(true);
                            }}
                          >
                            <Gift className="h-3.5 w-3.5" /> Redeem
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {activeTab === "rewards" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">{reward.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {reward.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {reward.type.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm font-bold text-purple-600">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {reward.pointsCost.toLocaleString("en-IN")} pts
                      </div>
                      {selectedCustomer && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedCustomer.points < reward.pointsCost}
                          onClick={() => {
                            setSelectedReward(reward);
                            setIsRedeemOpen(true);
                          }}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" /> Redeem
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "history" && (
              <>
                {!selectedCustomer ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select a customer from the Customers tab to view their history.
                  </p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No point transactions yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="text-sm font-medium">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              entry.type === "EARNED" || entry.type === "ADJUSTED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : "bg-red-50 text-red-700 border-red-300"
                            }
                          >
                            {entry.type === "EARNED" || entry.type === "ADJUSTED" ? "+" : ""}
                            {entry.points} pts
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: Selected Customer Summary */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Customer Detail
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCustomer ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold">{selectedCustomer.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                  <Badge className={`mt-1 ${TIER_BADGES[selectedCustomer.tier] ?? ""}`}>
                    {selectedCustomer.tier} Tier
                  </Badge>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {selectedCustomer.points.toLocaleString("en-IN")}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Available Points</p>
                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                    onClick={() => setIsAddOpen(true)}
                  >
                    <PlusCircle className="h-4 w-4" /> Add Points
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setIsRedeemOpen(true)}
                  >
                    <Gift className="h-4 w-4" /> Redeem Reward
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Click a customer to view details and manage points.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Points Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Points</DialogTitle>
            <DialogDescription>
              {selectedCustomer
                ? `Add loyalty points to ${selectedCustomer.name}`
                : "Add points to customer account"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Points Amount</Label>
              <Input
                type="number"
                placeholder="Enter points"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                placeholder="Reason for adding points"
                value={pointsNote}
                onChange={(e) => setPointsNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddPoints} disabled={isPending}>
              {isPending ? "Adding..." : "Add Points"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Dialog */}
      <Dialog open={isRedeemOpen} onOpenChange={setIsRedeemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Points</DialogTitle>
            <DialogDescription>
              {selectedCustomer
                ? `${selectedCustomer.name} - ${selectedCustomer.points.toLocaleString("en-IN")} points available`
                : "Select a reward to redeem"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedReward?.id === reward.id
                    ? "border-blue-600 bg-blue-50"
                    : selectedCustomer && selectedCustomer.points < reward.pointsCost
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-muted/30"
                }`}
                onClick={() => {
                  if (selectedCustomer && selectedCustomer.points >= reward.pointsCost) {
                    setSelectedReward(reward);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{reward.name}</p>
                    <p className="text-xs text-muted-foreground">{reward.description}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs bg-purple-50 text-purple-700 border-purple-300"
                  >
                    {reward.pointsCost.toLocaleString("en-IN")} pts
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRedeemOpen(false); setSelectedReward(null); }}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleRedeemReward}
              disabled={isPending || !selectedReward}
            >
              {isPending ? "Redeeming..." : "Confirm Redemption"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
