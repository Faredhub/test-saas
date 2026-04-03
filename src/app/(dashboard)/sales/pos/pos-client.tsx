"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Minus,
  Trash2,
  Loader2,
  ShoppingCart,
  Zap,
  RotateCcw,
  CreditCard,
  Banknote,
  Smartphone,
  MoreHorizontal,
  CheckCircle2,
  Keyboard,
} from "lucide-react";
import { createPosInvoice } from "@/lib/actions/sales";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CartItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

type RecentItem = {
  description: string;
  unitPrice: number;
  taxRate: number;
};

type PaymentMethod = "Cash" | "Card" | "UPI" | "Other";

// ---------------------------------------------------------------------------
// LocalStorage helpers
// ---------------------------------------------------------------------------

const RECENT_KEY = "tixel-pos-recent-items";
const MAX_RECENT = 12;

function loadRecentItems(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentItem(item: RecentItem) {
  const items = loadRecentItems();
  const exists = items.findIndex(
    (i) => i.description.toLowerCase() === item.description.toLowerCase()
  );
  if (exists >= 0) items.splice(exists, 1);
  items.unshift(item);
  localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function POSClient() {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<"%" | "flat">("%");
  const [taxRate, setTaxRate] = useState(18);

  // Add-item form
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemQty, setItemQty] = useState("1");

  // Recent items
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  // UI state
  const [isPending, startTransition] = useTransition();
  const [completedInvoice, setCompletedInvoice] = useState<string | null>(null);

  // Refs
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentItems(loadRecentItems());
  }, []);

  // Focus item name on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        nameRef.current?.focus();
      }
      if (e.key === "Escape") {
        setItemName("");
        setItemPrice("");
        setItemQty("1");
        nameRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ---------------------------------------------------------------------------
  // Cart logic
  // ---------------------------------------------------------------------------

  const addToCart = useCallback(
    (desc: string, price: number, qty: number, tax: number) => {
      if (!desc.trim() || price <= 0) return;

      setCart((prev) => {
        const existing = prev.find(
          (i) =>
            i.description.toLowerCase() === desc.toLowerCase() &&
            i.unitPrice === price
        );
        if (existing) {
          return prev.map((i) =>
            i.id === existing.id ? { ...i, quantity: i.quantity + qty } : i
          );
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            description: desc.trim(),
            quantity: qty,
            unitPrice: price,
            taxRate: tax,
          },
        ];
      });

      // Save to recent
      saveRecentItem({ description: desc.trim(), unitPrice: price, taxRate: tax });
      setRecentItems(loadRecentItems());
    },
    []
  );

  function handleAddItem(e?: React.FormEvent) {
    e?.preventDefault();
    const price = parseFloat(itemPrice);
    const qty = parseInt(itemQty) || 1;
    if (!itemName.trim() || isNaN(price) || price <= 0) {
      toast.error("Enter a valid item name and price");
      return;
    }
    addToCart(itemName, price, qty, taxRate);
    setItemName("");
    setItemPrice("");
    setItemQty("1");
    nameRef.current?.focus();
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  // ---------------------------------------------------------------------------
  // Calculations
  // ---------------------------------------------------------------------------

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxAmount = cart.reduce(
    (s, i) => s + (i.quantity * i.unitPrice * i.taxRate) / 100,
    0
  );

  const discountVal = parseFloat(discountInput) || 0;
  const discountAmount =
    discountType === "%"
      ? (subtotal * Math.min(discountVal, 100)) / 100
      : Math.min(discountVal, subtotal);
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);

  // ---------------------------------------------------------------------------
  // Complete sale
  // ---------------------------------------------------------------------------

  function completeSale() {
    if (cart.length === 0) {
      toast.error("Add at least one item to the cart");
      return;
    }

    startTransition(async () => {
      try {
        const invoice = await createPosInvoice({
          items: cart.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
          })),
          customerName: customerName || undefined,
          paymentMethod,
          discount: discountAmount,
        });

        setCompletedInvoice(invoice.invoiceNo);
        toast.success(`Sale completed! Invoice ${invoice.invoiceNo}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to complete sale"
        );
      }
    });
  }

  function resetSale() {
    setCart([]);
    setCustomerName("");
    setPaymentMethod("Cash");
    setDiscountInput("");
    setDiscountType("%");
    setCompletedInvoice(null);
    nameRef.current?.focus();
  }

  // ---------------------------------------------------------------------------
  // Success screen
  // ---------------------------------------------------------------------------

  if (completedInvoice) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-6 p-10">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Sale Complete!</h2>
              <p className="mt-2 text-muted-foreground">
                Invoice <span className="font-mono font-semibold text-foreground">{completedInvoice}</span> has been created.
              </p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(grandTotal)}
              </p>
            </div>
            <Button size="lg" className="h-14 w-full text-lg" onClick={resetSale}>
              <RotateCcw className="mr-2 h-5 w-5" />
              New Sale
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main POS layout
  // ---------------------------------------------------------------------------

  const paymentMethods: { key: PaymentMethod; icon: React.ReactNode; label: string }[] = [
    { key: "Cash", icon: <Banknote className="h-4 w-4" />, label: "Cash" },
    { key: "Card", icon: <CreditCard className="h-4 w-4" />, label: "Card" },
    { key: "UPI", icon: <Smartphone className="h-4 w-4" />, label: "UPI" },
    { key: "Other", icon: <MoreHorizontal className="h-4 w-4" />, label: "Other" },
  ];

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4 overflow-hidden">
      {/* ================================================================ */}
      {/* LEFT PANEL - Product / Quick Add (70%) */}
      {/* ================================================================ */}
      <div className="flex w-[70%] flex-col gap-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Point of Sale</h1>
              <p className="text-xs text-muted-foreground">Quick billing interface</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            <Keyboard className="h-3.5 w-3.5" />
            <span><kbd className="font-mono">F2</kbd> Search</span>
            <span className="mx-1">|</span>
            <span><kbd className="font-mono">Enter</kbd> Add</span>
            <span className="mx-1">|</span>
            <span><kbd className="font-mono">Esc</kbd> Clear</span>
          </div>
        </div>

        {/* Recent Items */}
        {recentItems.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recent Items
            </p>
            <div className="flex flex-wrap gap-2">
              {recentItems.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => addToCart(item.description, item.unitPrice, 1, item.taxRate)}
                  className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:bg-primary/5 hover:border-primary/30 active:scale-[0.98]"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-medium">{item.description}</span>
                  <span className="text-muted-foreground">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(item.unitPrice)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add Item Form */}
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleAddItem} className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="pos-item-name" className="mb-1.5 text-xs">
                  Item Name
                </Label>
                <Input
                  ref={nameRef}
                  id="pos-item-name"
                  placeholder="Type item name..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="w-32">
                <Label htmlFor="pos-item-price" className="mb-1.5 text-xs">
                  Price
                </Label>
                <Input
                  id="pos-item-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="w-20">
                <Label htmlFor="pos-item-qty" className="mb-1.5 text-xs">
                  Qty
                </Label>
                <Input
                  id="pos-item-qty"
                  type="number"
                  min="1"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="w-24">
                <Label htmlFor="pos-tax-rate" className="mb-1.5 text-xs">
                  Tax %
                </Label>
                <Input
                  id="pos-tax-rate"
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="h-12 text-base"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-6">
                <Plus className="mr-1.5 h-5 w-5" />
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Cart items list (scrollable) */}
        <div className="flex-1 overflow-y-auto rounded-xl border bg-background">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="mb-3 h-12 w-12 opacity-20" />
              <p className="text-sm">No items added yet</p>
              <p className="text-xs">Type an item name and price above to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 border-b bg-muted/50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Tax</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cart.map((item, idx) => {
                  const lineTotal =
                    item.quantity * item.unitPrice * (1 + item.taxRate / 100);
                  return (
                    <tr key={item.id} className="group">
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{item.description}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-muted active:scale-95"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-muted active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {item.taxRate}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(lineTotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* RIGHT PANEL - Bill Summary (30%) */}
      {/* ================================================================ */}
      <div className="flex w-[30%] flex-col overflow-hidden rounded-xl border bg-background">
        {/* Bill header */}
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-bold">Current Bill</h2>
          <p className="text-xs text-muted-foreground">
            {cart.length} {cart.length === 1 ? "item" : "items"}
          </p>
        </div>

        {/* Scrollable bill details */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {/* Customer */}
          <div>
            <Label htmlFor="pos-customer" className="mb-1.5 text-xs">
              Customer Name (optional)
            </Label>
            <Input
              id="pos-customer"
              placeholder="Walk-in customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Payment method */}
          <div>
            <Label className="mb-1.5 text-xs">Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.key}
                  type="button"
                  onClick={() => setPaymentMethod(pm.key)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    paymentMethod === pm.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {pm.icon}
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div>
            <Label className="mb-1.5 text-xs">Discount</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="h-10 flex-1"
              />
              <div className="flex overflow-hidden rounded-lg border">
                <button
                  type="button"
                  onClick={() => setDiscountType("%")}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    discountType === "%"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("flat")}
                  className={`border-l px-3 py-2 text-sm font-medium transition-colors ${
                    discountType === "flat"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  Flat
                </button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-mono">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(taxAmount)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="font-mono">
                  -{" "}
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                  }).format(discountAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom: Grand total + action */}
        <div className="border-t bg-muted/30 px-5 py-4">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-sm font-medium text-muted-foreground">Grand Total</span>
            <span className="text-3xl font-bold tracking-tight">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(grandTotal)}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-14 flex-1"
              onClick={resetSale}
              disabled={isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <Button
              className="h-14 flex-[2] text-lg font-bold"
              onClick={completeSale}
              disabled={isPending || cart.length === 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Charge{" "}
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                  }).format(grandTotal)}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
