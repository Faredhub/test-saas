"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShoppingBag,
  ShoppingCart,
  CheckCircle2,
  Search,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { createDeliveryOrder } from "@/lib/actions/inventory";
import { toast } from "sonner";

interface StoreProduct {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  sellingPrice: number;
  description?: string | null;
  imageUrl?: string | null;
  stockQty: number;
}

interface CartItem {
  product: StoreProduct;
  quantity: number;
}

interface SiteStoreClientProps {
  products: StoreProduct[];
}

export function SiteStoreClient({ products }: SiteStoreClientProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Customer Checkout state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");

  const [isPending, startTransition] = useTransition();

  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category || "General")))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || (p.category || "General") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: StoreProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`Added ${product.name} to cart`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);

  const handleCheckout = () => {
    if (!customerName.trim() || !address.trim()) {
      toast.error("Please fill in your name and delivery address");
      return;
    }

    startTransition(async () => {
      try {
        const delivery = await createDeliveryOrder({
          sourceDocument: "STORE-ONLINE",
          contactName: customerName.trim(),
          contactPhone: customerPhone.trim() || undefined,
          notes: `Delivery Address: ${address}`,
          items: cart.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            demandQty: item.quantity,
          })),
        });

        setOrderSuccess(delivery.deliveryNo);
        setCart([]);
        setShowCheckoutModal(false);
        toast.success("Order placed successfully!");
      } catch (err: any) {
        toast.error(err?.message || "Failed to place order");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* PUBLIC HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight">TixelStore Online</h1>
            <p className="text-xs text-slate-400">Enterprise Product Storefront</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowCartModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white relative shadow-md shadow-blue-600/20"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Cart
            {totalItemCount > 0 && (
              <span className="ml-2 bg-white text-blue-600 font-bold rounded-full h-5 w-5 flex items-center justify-center text-xs">
                {totalItemCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="py-12 px-6 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Sparkles className="h-3.5 w-3.5" /> Instant Stock Availability & Express Delivery
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Enterprise Products & Hardware Catalog
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            Order enterprise hardware, software licenses, and manufacturing inventory directly from our online store.
          </p>
        </div>
      </section>

      {/* MAIN CATALOG AREA */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* SEARCH & CATEGORY BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-950 border-slate-800 text-white text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={
                  selectedCategory === cat
                    ? "bg-blue-600 text-white"
                    : "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
                }
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* PRODUCT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-16 text-slate-400">
              No products found in store catalog.
            </div>
          ) : (
            filteredProducts.map((product) => (
              <Card key={product.id} className="bg-slate-900 border-slate-800 text-slate-100 flex flex-col justify-between hover:border-slate-700 transition-all">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                      {product.category || "General"}
                    </Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[11px]">
                      {product.stockQty > 0 ? `${product.stockQty} in stock` : "Out of stock"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold mt-2 text-white">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {product.description || "High-quality enterprise hardware unit."}
                  </p>
                  <div className="text-2xl font-extrabold text-white">
                    ₹{product.sellingPrice.toLocaleString()}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    onClick={() => addToCart(product)}
                    disabled={product.stockQty <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* SHOPPING CART MODAL */}
      <Dialog open={showCartModal} onOpenChange={setShowCartModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-400" />
              Your Shopping Cart ({totalItemCount} items)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">Your cart is currently empty.</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800"
                >
                  <div>
                    <h4 className="font-semibold text-sm text-white">{item.product.name}</h4>
                    <p className="text-xs text-slate-400">
                      ₹{item.product.sellingPrice.toLocaleString()} each
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 hover:text-white text-slate-400"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 hover:text-white text-slate-400"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">
                      ₹{(item.product.sellingPrice * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-400">Subtotal:</span>
              <div className="text-xl font-bold text-white">₹{cartSubtotal.toLocaleString()}</div>
            </div>
            <Button
              onClick={() => {
                setShowCartModal(false);
                setShowCheckoutModal(true);
              }}
              disabled={cart.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              Proceed to Checkout <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CHECKOUT MODAL */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-400" />
              Customer Checkout
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Enter delivery details to complete your order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-slate-300">Full Name</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Doe"
                className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Phone Number</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Delivery Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Building, Tech Park, Street, City"
                className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Total Items:</span>
                <span className="text-white font-bold">{totalItemCount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Order Total:</span>
                <span className="text-emerald-400 font-bold">₹{cartSubtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCheckoutModal(false)}
              className="border-slate-700 bg-slate-800 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCheckout}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Place Order & Generate Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ORDER SUCCESS MODAL */}
      <Dialog open={!!orderSuccess} onOpenChange={() => setOrderSuccess(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm text-center">
          <div className="py-4 space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Order Confirmed!</h3>
            <p className="text-xs text-slate-400">
              Your order has been placed successfully. Delivery tracking ID:
            </p>
            <div className="p-2 bg-slate-950 font-mono text-emerald-400 font-bold text-sm rounded border border-slate-800">
              {orderSuccess}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setOrderSuccess(null)} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
              Continue Shopping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
