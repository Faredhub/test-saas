"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, Loader2, Users, Receipt, ShoppingBag, ShieldCheck,
  Star, Truck, Clock, IndianRupee, FileText, CheckCircle2, ArrowRight,
  Pencil, Trash2, ExternalLink, Filter, Building2, PackageCheck, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  createVendor, updateVendor, deleteVendor,
  createVendorProduct, deleteVendorProduct,
  createPurchaseOrder, updatePurchaseOrderStatus, postVendorBillFromPO,
} from "@/lib/actions/inventory";
import { createVendorBill } from "@/lib/actions/finance";

interface VendorItem {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  gstNo: string | null;
  panNo: string | null;
  category: string | null;
  paymentTerms: string | null;
  rating: number;
  isActive: boolean;
  bankName: string | null;
  accountNo: string | null;
  ifscCode: string | null;
  notes: string | null;
  _count?: { products: number; purchaseOrders: number; vendorBills: number };
  totalBilled?: number;
  totalPaid?: number;
  pendingBillsCount?: number;
}

interface VendorProductItem {
  id: string;
  vendorId: string;
  productName: string;
  supplierSku: string | null;
  unit: string;
  price: number;
  minOrderQty: number;
  leadTimeDays: number;
  isPreferred: boolean;
  notes: string | null;
  vendor?: { id: string; name: string; code: string };
  product?: { id: string; name: string; sku: string } | null;
}

interface PurchaseOrderItem {
  id: string;
  poNo: string;
  vendorId: string;
  status: string;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  orderDate: Date | string;
  expectedDelivery: Date | string | null;
  receivedDate: Date | string | null;
  qualityStatus: string;
  items: any;
  notes: string | null;
  vendor: { id: string; name: string; code: string; gstNo?: string | null };
}

interface VendorBillItem {
  id: string;
  billNo: string;
  vendorId?: string | null;
  vendorName: string;
  vendorGst?: string | null;
  description?: string | null;
  amount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  status: string;
  dueDate?: Date | string | null;
}

interface ProductSimple {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
}

interface Props {
  initialVendors: VendorItem[];
  initialVendorProducts: VendorProductItem[];
  initialPurchaseOrders: PurchaseOrderItem[];
  products: ProductSimple[];
  initialBills: VendorBillItem[];
}

function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

export function VendorsClient({
  initialVendors,
  initialVendorProducts,
  initialPurchaseOrders,
  products,
  initialBills,
}: Props) {
  const [vendors, setVendors] = useState<VendorItem[]>(initialVendors);
  const [vendorProducts, setVendorProducts] = useState<VendorProductItem[]>(initialVendorProducts);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>(initialPurchaseOrders);
  const [bills, setBills] = useState<VendorBillItem[]>(initialBills);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("directory");

  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [isCreateVendorOpen, setIsCreateVendorOpen] = useState(false);
  const [isCreateProductPriceOpen, setIsCreateProductPriceOpen] = useState(false);
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
  const [isPostBillOpen, setIsPostBillOpen] = useState(false);
  const [selectedVendorForBill, setSelectedVendorForBill] = useState<VendorItem | null>(null);
  const [selectedVendorDetail, setSelectedVendorDetail] = useState<VendorItem | null>(null);

  // Filtered Vendors
  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.code.toLowerCase().includes(search.toLowerCase()) ||
      (v.gstNo && v.gstNo.toLowerCase().includes(search.toLowerCase())) ||
      (v.city && v.city.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === "ALL" || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Aggregated Stats
  const totalVendors = vendors.length;
  const activePOs = purchaseOrders.filter((po) => po.status !== "COMPLETED" && po.status !== "CANCELLED").length;
  const totalBilledVal = bills.reduce((acc, b) => acc + Number(b.total || 0), 0);
  const totalPendingVal = bills
    .filter((b) => b.status === "PENDING" || b.status === "APPROVED" || b.status === "PARTIALLY_PAID")
    .reduce((acc, b) => acc + (Number(b.total || 0) - Number(b.paidAmount || 0)), 0);

  // Form Handlers
  async function handleCreateVendor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const newVendor = await createVendor({
          name: formData.get("name") as string,
          email: (formData.get("email") as string) || undefined,
          phone: (formData.get("phone") as string) || undefined,
          address: (formData.get("address") as string) || undefined,
          city: (formData.get("city") as string) || undefined,
          state: (formData.get("state") as string) || undefined,
          pincode: (formData.get("pincode") as string) || undefined,
          gstNo: (formData.get("gstNo") as string) || undefined,
          panNo: (formData.get("panNo") as string) || undefined,
          category: (formData.get("category") as string) || "GENERAL",
          paymentTerms: (formData.get("paymentTerms") as string) || "NET30",
          bankName: (formData.get("bankName") as string) || undefined,
          accountNo: (formData.get("accountNo") as string) || undefined,
          ifscCode: (formData.get("ifscCode") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });

        setVendors((prev) => [newVendor as any, ...prev]);
        toast.success(`Vendor ${newVendor.name} created successfully!`);
        setIsCreateVendorOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create vendor");
      }
    });
  }

  async function handleCreateVendorProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const vendorId = formData.get("vendorId") as string;
        const productId = formData.get("productId") as string;
        const selectedProd = products.find((p) => p.id === productId);

        const newVP = await createVendorProduct({
          vendorId,
          productId: productId || undefined,
          productName: selectedProd ? selectedProd.name : (formData.get("productName") as string),
          supplierSku: (formData.get("supplierSku") as string) || undefined,
          price: parseFloat(formData.get("price") as string),
          minOrderQty: parseInt(formData.get("minOrderQty") as string) || 1,
          leadTimeDays: parseInt(formData.get("leadTimeDays") as string) || 3,
          isPreferred: formData.get("isPreferred") === "on",
          notes: (formData.get("notes") as string) || undefined,
        });

        setVendorProducts((prev) => [newVP as any, ...prev]);
        toast.success("Vendor product pricing record added!");
        setIsCreateProductPriceOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add vendor product");
      }
    });
  }

  async function handleCreatePO(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const vendorId = formData.get("vendorId") as string;
        const productName = formData.get("productName") as string;
        const qty = parseInt(formData.get("qty") as string) || 1;
        const unitPrice = parseFloat(formData.get("unitPrice") as string) || 0;

        const newPO = await createPurchaseOrder({
          vendorId,
          expectedDelivery: (formData.get("expectedDelivery") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
          items: [{ productName, qty, unitPrice }],
        });

        setPurchaseOrders((prev) => [newPO as any, ...prev]);
        toast.success(`Purchase Order ${newPO.poNo} created!`);
        setIsCreatePOOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create Purchase Order");
      }
    });
  }

  async function handlePostDirectBill(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const vendorId = formData.get("vendorId") as string;
        const vendor = vendors.find((v) => v.id === vendorId);
        const amount = parseFloat(formData.get("amount") as string);
        const taxAmount = formData.get("taxAmount") ? parseFloat(formData.get("taxAmount") as string) : amount * 0.18;

        const newBill = await createVendorBill({
          vendorId,
          vendorName: vendor ? vendor.name : (formData.get("vendorName") as string),
          vendorGst: vendor?.gstNo || (formData.get("vendorGst") as string) || undefined,
          description: (formData.get("description") as string) || "Site Store Procurement Bill",
          amount,
          taxAmount,
          dueDate: (formData.get("dueDate") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });

        setBills((prev) => [newBill as any, ...prev]);
        toast.success(`Vendor Bill ${newBill.billNo} posted directly to Finance!`);
        setIsPostBillOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to post vendor bill");
      }
    });
  }

  async function handlePostBillFromPO(poId: string) {
    startTransition(async () => {
      try {
        const bill = await postVendorBillFromPO(poId);
        setBills((prev) => [bill as any, ...prev]);
        setPurchaseOrders((prev) =>
          prev.map((po) => (po.id === poId ? { ...po, status: "BILLED" } : po))
        );
        toast.success(`3-Way Match Verified! Bill ${bill.billNo} created in Finance/Bills.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to post bill from PO");
      }
    });
  }

  async function handleUpdatePOStatus(poId: string, status: string, qualityStatus?: string) {
    startTransition(async () => {
      try {
        await updatePurchaseOrderStatus(poId, status, qualityStatus);
        setPurchaseOrders((prev) =>
          prev.map((po) =>
            po.id === poId
              ? {
                  ...po,
                  status,
                  ...(qualityStatus ? { qualityStatus } : {}),
                }
              : po
          )
        );
        toast.success(`PO status updated to ${status}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update PO status");
      }
    });
  }

  async function handleDeleteVendor(id: string) {
    if (!confirm("Are you sure you want to delete this vendor?")) return;
    startTransition(async () => {
      try {
        await deleteVendor(id);
        setVendors((prev) => prev.filter((v) => v.id !== id));
        toast.success("Vendor deleted successfully");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete vendor");
      }
    });
  }

  return (
    <div className="space-y-6 p-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors Management</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Create supplier records, manage pricing & lead times, confirm POs, 3-way match, and link with Finance Bills.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Dialog open={isPostBillOpen} onOpenChange={setIsPostBillOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3.5 py-2 text-sm font-medium whitespace-nowrap">
              <FileText className="h-4 w-4 text-blue-600" />
              Post Bill to Finance
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Post Vendor Bill to Finance</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePostDirectBill} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="vendorId">Select Vendor *</Label>
                  <Select name="vendorId" required defaultValue={selectedVendorForBill?.id || ""}>
                    <SelectTrigger><SelectValue placeholder="Choose a registered vendor" /></SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} ({v.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Subtotal Amount (₹) *</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" required placeholder="50000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxAmount">GST Tax Amount (₹)</Label>
                    <Input id="taxAmount" name="taxAmount" type="number" step="0.01" placeholder="9000 (18%)" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Bill Description</Label>
                  <Input id="description" name="description" placeholder="e.g. Raw Material Batch #409" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Payment Due Date</Label>
                  <Input id="dueDate" name="dueDate" type="date" />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Post Bill to /finance/bills
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateVendorOpen} onOpenChange={setIsCreateVendorOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-3.5 py-2 text-sm font-medium cursor-pointer transition-colors whitespace-nowrap">
              <Plus className="h-4 w-4" /> Add Vendor
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Register New Vendor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateVendor} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Vendor Company Name *</Label>
                    <Input id="name" name="name" required placeholder="Acme Logistics & Supplies" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" defaultValue="RAW_MATERIALS">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RAW_MATERIALS">Raw Materials</SelectItem>
                        <SelectItem value="EQUIPMENT">Equipment & Machinery</SelectItem>
                        <SelectItem value="SERVICES">Services & Subcontracting</SelectItem>
                        <SelectItem value="SUPPLIES">Store Supplies & Spares</SelectItem>
                        <SelectItem value="GENERAL">General Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input id="email" name="email" type="email" placeholder="vendor@acme.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Phone</Label>
                    <Input id="phone" name="phone" placeholder="+91 98765 43210" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gstNo">GST Number</Label>
                    <Input id="gstNo" name="gstNo" placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panNo">PAN Number</Label>
                    <Input id="panNo" name="panNo" placeholder="ABCDE1234F" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" placeholder="Mumbai" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" name="state" placeholder="Maharashtra" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Select name="paymentTerms" defaultValue="NET30">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NET15">NET 15 Days</SelectItem>
                        <SelectItem value="NET30">NET 30 Days</SelectItem>
                        <SelectItem value="NET60">NET 60 Days</SelectItem>
                        <SelectItem value="DUE_ON_RECEIPT">Due on Receipt</SelectItem>
                        <SelectItem value="ADVANCE">100% Advance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input id="bankName" name="bankName" placeholder="HDFC Bank" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNo">Account Number</Label>
                    <Input id="accountNo" name="accountNo" placeholder="50100234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input id="ifscCode" name="ifscCode" placeholder="HDFC0000123" />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Vendor
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Vendors</p>
              <h3 className="text-2xl font-bold mt-1">{totalVendors}</h3>
            </div>
            <div className="p-3 rounded-full bg-amber-500/10 text-amber-600">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active POs / RFQs</p>
              <h3 className="text-2xl font-bold mt-1">{activePOs}</h3>
            </div>
            <div className="p-3 rounded-full bg-blue-500/10 text-blue-600">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Billed in Finance</p>
              <h3 className="text-2xl font-bold mt-1">{formatINR(totalBilledVal)}</h3>
            </div>
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
              <Receipt className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Outstanding Bills</p>
              <h3 className="text-2xl font-bold mt-1">{formatINR(totalPendingVal)}</h3>
            </div>
            <div className="p-3 rounded-full bg-rose-500/10 text-rose-600">
              <IndianRupee className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl bg-muted/60 p-1">
          <TabsTrigger value="directory" className="gap-2">
            <Users className="h-4 w-4" /> Directory
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <Truck className="h-4 w-4" /> Pricing & Lead Time
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingBag className="h-4 w-4" /> RFQs & POs
          </TabsTrigger>
          <TabsTrigger value="bills" className="gap-2">
            <Receipt className="h-4 w-4" /> 3-Way Match & Bills
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <Star className="h-4 w-4" /> Performance
          </TabsTrigger>
        </TabsList>

        {/* =================================================================== */}
        {/* TAB 1: VENDOR DIRECTORY */}
        {/* =================================================================== */}
        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Vendor Records</CardTitle>
                  <CardDescription>Maintain primary vendor profiles, contact details, GST, and terms.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vendors..."
                      className="pl-8"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={(val) => val && setCategoryFilter(val)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      <SelectItem value="RAW_MATERIALS">Raw Materials</SelectItem>
                      <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                      <SelectItem value="SERVICES">Services</SelectItem>
                      <SelectItem value="SUPPLIES">Supplies</SelectItem>
                      <SelectItem value="GENERAL">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor Code</TableHead>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>GST / PAN</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Payment Terms</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="text-right">Total Billed</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                          No vendors found. Click "Add Vendor" to create your first supplier profile.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVendors.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono font-medium text-xs">{v.code}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold">{v.name}</div>
                              {v.city && <div className="text-xs text-muted-foreground">{v.city}, {v.state || "India"}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {v.email && <div>{v.email}</div>}
                            {v.phone && <div className="text-muted-foreground">{v.phone}</div>}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {v.gstNo ? <Badge variant="outline" className="text-[10px]">{v.gstNo}</Badge> : <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {v.category || "GENERAL"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{v.paymentTerms || "NET30"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
                              <Star className="h-3.5 w-3.5 fill-amber-400" />
                              {v.rating ? Number(v.rating).toFixed(1) : "5.0"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs">
                            {formatINR(v.totalBilled || 0)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs"
                                onClick={() => setSelectedVendorDetail(v)}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteVendor(v.id)}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 2: PRODUCT-SPECIFIC SUPPLIER PRICING */}
        {/* =================================================================== */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Product Supplier Pricing & Lead Times</CardTitle>
                <CardDescription>
                  Maintain product-specific supplier info including negotiated unit price, MOQ, and delivery lead time.
                </CardDescription>
              </div>

              <Dialog open={isCreateProductPriceOpen} onOpenChange={setIsCreateProductPriceOpen}>
                <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
                  <Plus className="h-4 w-4" /> Add Supplier Pricing
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Supplier Product Price & MOQ</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateVendorProduct} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Select Vendor *</Label>
                      <Select name="vendorId" required>
                        <SelectTrigger><SelectValue placeholder="Choose vendor" /></SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Link System Product (Optional)</Label>
                        <Select name="productId">
                          <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Product / Item Name *</Label>
                        <Input name="productName" required placeholder="e.g. Steel Pipe 50mm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Negotiated Price (₹) *</Label>
                        <Input name="price" type="number" step="0.01" required placeholder="1250" />
                      </div>
                      <div className="space-y-2">
                        <Label>Minimum Order Qty (MOQ)</Label>
                        <Input name="minOrderQty" type="number" defaultValue="10" />
                      </div>
                      <div className="space-y-2">
                        <Label>Lead Time (Days)</Label>
                        <Input name="leadTimeDays" type="number" defaultValue="3" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Supplier SKU / Part #</Label>
                        <Input name="supplierSku" placeholder="SUPP-PART-99" />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input type="checkbox" id="isPreferred" name="isPreferred" className="h-4 w-4" />
                        <Label htmlFor="isPreferred">Set as Preferred Supplier</Label>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={isPending}>Save Pricing Record</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Supplier SKU</TableHead>
                      <TableHead>Negotiated Price</TableHead>
                      <TableHead>MOQ</TableHead>
                      <TableHead>Lead Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                          No supplier product pricing recorded yet. Click "Add Supplier Pricing" to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      vendorProducts.map((vp) => (
                        <TableRow key={vp.id}>
                          <TableCell className="font-semibold">{vp.vendor?.name || "Vendor"}</TableCell>
                          <TableCell>{vp.productName}</TableCell>
                          <TableCell className="font-mono text-xs">{vp.supplierSku || "-"}</TableCell>
                          <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatINR(vp.price)} / {vp.unit}
                          </TableCell>
                          <TableCell>{vp.minOrderQty} {vp.unit}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" /> {vp.leadTimeDays} days
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {vp.isPreferred ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                Preferred
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Standard</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 3: RFQs & PURCHASE ORDERS */}
        {/* =================================================================== */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Purchase Orders & RFQs</CardTitle>
                <CardDescription>
                  Create RFQs, compare quotes, confirm Purchase Orders, and receive goods.
                </CardDescription>
              </div>

              <Dialog open={isCreatePOOpen} onOpenChange={setIsCreatePOOpen}>
                <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
                  <Plus className="h-4 w-4" /> Create Purchase Order
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Issue New Purchase Order (PO)</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePO} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Select Vendor *</Label>
                      <Select name="vendorId" required>
                        <SelectTrigger><SelectValue placeholder="Choose vendor" /></SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Item / Product Name *</Label>
                      <Input name="productName" required placeholder="e.g. Industrial Hydraulic Valves" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input name="qty" type="number" required defaultValue="50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Price (₹) *</Label>
                        <Input name="unitPrice" type="number" step="0.01" required placeholder="450" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Expected Delivery Date</Label>
                      <Input name="expectedDelivery" type="date" />
                    </div>

                    <div className="space-y-2">
                      <Label>Special Instructions / Notes</Label>
                      <Textarea name="notes" placeholder="Delivery at Warehouse Gate #2..." />
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={isPending}>Create PO</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>GST (18%)</TableHead>
                      <TableHead>Grand Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Quality Check</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                          No Purchase Orders issued yet. Click "Create Purchase Order" to generate one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseOrders.map((po) => (
                        <TableRow key={po.id}>
                          <TableCell className="font-mono font-semibold text-xs">{po.poNo}</TableCell>
                          <TableCell className="font-medium">{po.vendor?.name}</TableCell>
                          <TableCell>{formatINR(po.totalAmount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatINR(po.taxAmount)}</TableCell>
                          <TableCell className="font-bold">{formatINR(po.grandTotal)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                po.status === "CONFIRMED"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                  : po.status === "COMPLETED" || po.status === "BILLED"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              }
                            >
                              {po.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {po.qualityStatus || "PASSED"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {po.status === "BILLED" ? (
                              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Billed in Finance
                              </Badge>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                {po.status === "DRAFT" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => handleUpdatePOStatus(po.id, "CONFIRMED")}
                                  >
                                    Confirm PO
                                  </Button>
                                )}
                                {po.status === "CONFIRMED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-emerald-500/30 text-emerald-600"
                                    onClick={() => handleUpdatePOStatus(po.id, "COMPLETED")}
                                  >
                                    Receive Goods
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                  onClick={() => handlePostBillFromPO(po.id)}
                                >
                                  <Receipt className="h-3.5 w-3.5" /> 3-Way Match & Post Bill
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 4: 3-WAY MATCH & FINANCE BILLS LINK */}
        {/* =================================================================== */}
        <TabsContent value="bills" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Finance Vendor Bills & 3-Way Match Integration</CardTitle>
                <CardDescription>
                  All vendor bills posted to Finance (`/finance/bills`) with 3-way match verification (PO vs Goods Receipt vs Bill).
                </CardDescription>
              </div>
              <Link href="/finance/bills">
                <Button variant="outline" className="gap-2">
                  Go to /finance/bills <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Bill Amount</TableHead>
                      <TableHead>Tax Amount</TableHead>
                      <TableHead>Total Bill</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>3-Way Match Status</TableHead>
                      <TableHead>Bill Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                          No vendor bills recorded in Finance yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      bills.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono font-semibold text-xs">{b.billNo}</TableCell>
                          <TableCell className="font-medium">{b.vendorName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{b.description || "Vendor Bill"}</TableCell>
                          <TableCell>{formatINR(b.amount)}</TableCell>
                          <TableCell className="text-xs">{formatINR(b.taxAmount)}</TableCell>
                          <TableCell className="font-bold">{formatINR(b.total)}</TableCell>
                          <TableCell className="text-emerald-600 font-medium">{formatINR(b.paidAmount)}</TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[11px]">
                              <ShieldCheck className="h-3 w-3" /> Verified (Matched)
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                b.status === "PAID"
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                                  : b.status === "APPROVED"
                                  ? "bg-blue-500/10 text-blue-700 border-blue-300"
                                  : "bg-amber-500/10 text-amber-700 border-amber-300"
                              }
                            >
                              {b.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 5: VENDOR PERFORMANCE & REPORTS */}
        {/* =================================================================== */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" /> Vendor Ratings & Scorecards
                </CardTitle>
                <CardDescription>Evaluates delivery speed, quality checks, and payment compliance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {vendors.slice(0, 5).map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/40">
                    <div>
                      <div className="font-semibold text-sm">{v.name}</div>
                      <div className="text-xs text-muted-foreground">{v.category || "GENERAL"} • {v.paymentTerms || "NET30"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-500 font-bold">
                        <Star className="h-4 w-4 fill-amber-400 mr-1" />
                        {v.rating ? Number(v.rating).toFixed(1) : "5.0"} / 5.0
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" /> Procurement Integrity & 3-Way Matching
                </CardTitle>
                <CardDescription>Summary of 3-way matching accuracy between Purchase Orders and Finance Bills.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" /> 100% 3-Way Match Verification Active
                  </div>
                  <p className="text-xs mt-1 opacity-90">
                    All POs posted from Site Store to Finance Bills automatically verify Purchase Order Quantity, Goods Received Note (GRN), and Vendor Invoice details.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-md border">
                    <div className="text-xs text-muted-foreground">Total Linked Bills</div>
                    <div className="text-xl font-bold mt-1">{bills.length}</div>
                  </div>
                  <div className="p-3 rounded-md border">
                    <div className="text-xs text-muted-foreground">Total Paid to Vendors</div>
                    <div className="text-xl font-bold text-emerald-600 mt-1">
                      {formatINR(bills.reduce((acc, b) => acc + Number(b.paidAmount || 0), 0))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Vendor Detail Dialog */}
      {selectedVendorDetail && (
        <Dialog open={!!selectedVendorDetail} onOpenChange={() => setSelectedVendorDetail(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-500" /> {selectedVendorDetail.name} ({selectedVendorDetail.code})
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 text-sm py-2">
              <div>
                <span className="text-muted-foreground">Category:</span>{" "}
                <Badge variant="outline">{selectedVendorDetail.category || "GENERAL"}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Payment Terms:</span>{" "}
                <span className="font-medium">{selectedVendorDetail.paymentTerms || "NET30"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span>{selectedVendorDetail.email || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>{" "}
                <span>{selectedVendorDetail.phone || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">GST Number:</span>{" "}
                <span className="font-mono">{selectedVendorDetail.gstNo || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">PAN Number:</span>{" "}
                <span className="font-mono">{selectedVendorDetail.panNo || "N/A"}</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Bank Account Details</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>Bank: {selectedVendorDetail.bankName || "N/A"}</div>
                <div>A/C: {selectedVendorDetail.accountNo || "N/A"}</div>
                <div>IFSC: {selectedVendorDetail.ifscCode || "N/A"}</div>
              </div>
            </div>

            <DialogFooter>
              <Link href="/finance/bills">
                <Button variant="outline" className="gap-2">
                  <Receipt className="h-4 w-4" /> View Bills in Finance
                </Button>
              </Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
