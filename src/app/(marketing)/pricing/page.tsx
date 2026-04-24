"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const tiers = [
  {
    name: "Starter",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "For small teams getting started with ERP basics.",
    popular: false,
    cta: "Get Started Free",
    features: [
      "Up to 5 users",
      "3 core modules",
      "1 GB storage",
      "Community support",
      "Basic reporting",
      "Single branch",
    ],
  },
  {
    name: "Professional",
    monthlyPrice: 999,
    yearlyPrice: 799,
    description: "For growing businesses that need the full platform.",
    popular: true,
    cta: "Start Free Trial",
    features: [
      "Up to 25 users",
      "All 15 modules",
      "10 GB storage",
      "Email support",
      "API access",
      "Multi-branch",
      "Custom reports",
      "Priority onboarding",
    ],
  },
  {
    name: "Enterprise",
    monthlyPrice: 2499,
    yearlyPrice: 1999,
    description: "For large organizations with advanced requirements.",
    popular: false,
    cta: "Contact Sales",
    features: [
      "Unlimited users",
      "All 15 modules",
      "100 GB storage",
      "Priority support (SLA)",
      "Custom integrations",
      "Dedicated account manager",
      "Multi-currency",
      "White-label options",
      "On-premise deployment",
    ],
  },
];

const comparisonFeatures = [
  { name: "Users", starter: "5", pro: "25", enterprise: "Unlimited" },
  { name: "Modules", starter: "3", pro: "15", enterprise: "15" },
  { name: "Storage", starter: "1 GB", pro: "10 GB", enterprise: "100 GB" },
  { name: "API Access", starter: false, pro: true, enterprise: true },
  { name: "Multi-branch", starter: false, pro: true, enterprise: true },
  { name: "Custom Reports", starter: false, pro: true, enterprise: true },
  { name: "GST Filing", starter: true, pro: true, enterprise: true },
  { name: "Email Support", starter: false, pro: true, enterprise: true },
  { name: "Priority Support", starter: false, pro: false, enterprise: true },
  {
    name: "Custom Integrations",
    starter: false,
    pro: false,
    enterprise: true,
  },
  {
    name: "Dedicated Account Manager",
    starter: false,
    pro: false,
    enterprise: true,
  },
  { name: "White-label", starter: false, pro: false, enterprise: true },
];

const faqs = [
  {
    question: "Can I switch plans later?",
    answer:
      "Yes. You can upgrade or downgrade your plan at any time. When upgrading, you only pay the prorated difference for the remainder of your billing cycle. Downgrades take effect at the start of your next billing period.",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer:
      "Every paid plan includes a 14-day free trial with full access to all features. No credit card required to start. If you decide not to continue, your account automatically reverts to the Starter plan.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept UPI, credit/debit cards, net banking, and wire transfers. For Enterprise plans, we also support purchase orders with NET-30 payment terms.",
  },
  {
    question: "Do you offer discounts for NGOs or educational institutions?",
    answer:
      "Yes. Registered nonprofits and educational institutions can apply for a 40% discount on any paid plan. Contact our sales team with your registration documents to get started.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "All data is stored on servers located in India (Mumbai region) to comply with data residency requirements. We use AES-256 encryption at rest and TLS 1.3 in transit. Daily encrypted backups are retained for 30 days.",
  },
];

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₹${price.toLocaleString("en-IN")}`;
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      {/* Header */}
      <section className="bg-zinc-950 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Start free and scale as your business grows. All paid plans include a
            14-day trial.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span
              className={`text-sm ${!yearly ? "text-white" : "text-zinc-500"}`}
            >
              Monthly
            </span>
            <Switch checked={yearly} onCheckedChange={setYearly} />
            <span
              className={`text-sm ${yearly ? "text-white" : "text-zinc-500"}`}
            >
              Yearly
            </span>
            {yearly && (
              <Badge className="ml-1 bg-green-600 text-xs text-white hover:bg-green-700">
                Save 20%
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {tiers.map((tier) => {
              const price = yearly ? tier.yearlyPrice : tier.monthlyPrice;
              return (
                <Card
                  key={tier.name}
                  className={`relative flex flex-col ${
                    tier.popular
                      ? "border-primary shadow-lg ring-1 ring-primary"
                      : ""
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="px-3 py-1">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {tier.description}
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        {formatPrice(price)}
                      </span>
                      {price > 0 && (
                        <span className="text-sm text-muted-foreground">
                          /month
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="flex-1 space-y-3">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-8 w-full"
                      variant={tier.popular ? "default" : "outline"}
                      render={<Link href="/register" />}
                    >
                      {tier.cta}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="border-t border-border/40 bg-muted/20 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Feature Comparison
          </h2>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pr-4 text-left font-semibold">
                    Feature
                  </th>
                  <th className="pb-3 px-4 text-center font-semibold">
                    Starter
                  </th>
                  <th className="pb-3 px-4 text-center font-semibold">
                    Professional
                  </th>
                  <th className="pb-3 pl-4 text-center font-semibold">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feat) => (
                  <tr
                    key={feat.name}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-3 pr-4 text-muted-foreground">
                      {feat.name}
                    </td>
                    {(
                      [feat.starter, feat.pro, feat.enterprise] as (
                        | string
                        | boolean
                      )[]
                    ).map((val, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        {typeof val === "boolean" ? (
                          val ? (
                            <Check className="mx-auto size-4 text-primary" />
                          ) : (
                            <X className="mx-auto size-4 text-muted-foreground/40" />
                          )
                        ) : (
                          <span className="font-medium">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Frequently Asked Questions
          </h2>

          <div className="mt-10 space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-xl border border-border/50 bg-background p-6"
              >
                <h3 className="font-semibold">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
