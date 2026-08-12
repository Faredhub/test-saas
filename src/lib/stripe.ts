import Stripe from "stripe";

let _stripe: Stripe | null = null;
let _initError: Error | null = null;

export function getStripe(): Stripe {
  if (_initError) throw _initError;
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      _initError = new Error("STRIPE_SECRET_KEY is not configured");
      throw _initError;
    }
    _stripe = new Stripe(key, {
      apiVersion: "2025-06-15.acacia" as any,
    });
  }
  return _stripe;
}
