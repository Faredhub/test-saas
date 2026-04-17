"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Gateway = "razorpay" | "stripe" | null;

interface PaymentButtonProps {
  invoiceId: string;
  amount: number;
  currency?: string;
  gateway: Gateway;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.head.appendChild(script);
  });
}

export function PaymentButton({
  invoiceId,
  amount,
  currency = "INR",
  gateway,
  onSuccess,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  if (!gateway) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium opacity-50 cursor-not-allowed"
          >
            <CreditCard className="h-4 w-4" />
            Pay Online
          </TooltipTrigger>
          <TooltipContent>
            <p>Payment gateway not configured</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  async function handlePay() {
    setLoading(true);

    try {
      // Step 1: Create order via API
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, currency }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create payment order");
      }

      const data = await res.json();

      if (data.gateway === "razorpay") {
        await handleRazorpay(data);
      } else if (data.gateway === "stripe") {
        await handleStripe(data);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
      setLoading(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleRazorpay(data: any) {
    try {
      await loadRazorpayScript();
    } catch {
      toast.error("Could not load Razorpay. Check your internet connection.");
      setLoading(false);
      return;
    }

    const options = {
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      name: data.tenantName || "Payment",
      description: `Invoice ${data.invoiceNo || ""}`,
      order_id: data.orderId,
      prefill: {
        name: data.contactName || "",
        email: data.contactEmail || "",
        contact: data.contactPhone || "",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: async (response: any) => {
        try {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId,
            }),
          });

          if (!verifyRes.ok) {
            const err = await verifyRes.json();
            throw new Error(err.error || "Payment verification failed");
          }

          toast.success("Payment successful!");
          onSuccess?.();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Verification failed"
          );
        } finally {
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
        },
      },
      theme: {
        color: "#2563eb",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleStripe(data: any) {
    // Stripe Checkout redirects the user to Stripe's hosted page
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error("Could not start Stripe checkout");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handlePay}
      disabled={loading}
      className="gap-2 bg-blue-600 hover:bg-blue-700"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ExternalLink className="h-4 w-4" />
      )}
      Pay Online
      {amount > 0 && (
        <span className="ml-1 tabular-nums">
          ({currency === "INR" ? "\u20B9" : "$"}
          {amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })})
        </span>
      )}
    </Button>
  );
}
