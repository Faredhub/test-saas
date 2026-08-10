"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck, FileText, CheckCircle2, ShoppingBag, Send, CreditCard, ArrowRight, Sparkles, Filter, Check, Clock, AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export type CustomerJourneyStepId =
  | "ALL"
  | "CUSTOMER_INTAKE"
  | "QUOTATION_REQUESTED"
  | "QUOTATION_CONFIRMED"
  | "SALES_ORDER_SENT"
  | "INVOICE_SENT"
  | "PAYMENT_STATUS";

export type CustomerJourneyStep = {
  id: CustomerJourneyStepId;
  stepNumber: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badgeColor: string;
  borderColor: string;
  iconBg: string;
  linkHref: string;
  dbFilterKey: string;
};

export const CUSTOMER_JOURNEY_STEPS: CustomerJourneyStep[] = [
  {
    id: "CUSTOMER_INTAKE",
    stepNumber: 1,
    title: "Customer Intake",
    subtitle: "Customer comes in & registered",
    icon: UserCheck,
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    borderColor: "border-blue-500",
    iconBg: "bg-blue-600 text-white",
    linkHref: "/sales/contacts",
    dbFilterKey: "stage=NEW_LEAD",
  },
  {
    id: "QUOTATION_REQUESTED",
    stepNumber: 2,
    title: "Request Quotation",
    subtitle: "Quotation prepared & sent",
    icon: FileText,
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    borderColor: "border-purple-500",
    iconBg: "bg-purple-600 text-white",
    linkHref: "/sales/quotations",
    dbFilterKey: "status=SENT",
  },
  {
    id: "QUOTATION_CONFIRMED",
    stepNumber: 3,
    title: "Confirms Price",
    subtitle: "Quotation price confirmed",
    icon: CheckCircle2,
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    borderColor: "border-emerald-500",
    iconBg: "bg-emerald-600 text-white",
    linkHref: "/sales/quotations?status=ACCEPTED",
    dbFilterKey: "status=ACCEPTED",
  },
  {
    id: "SALES_ORDER_SENT",
    stepNumber: 4,
    title: "Sales Order Sent",
    subtitle: "Generated & sent (Not Invoice)",
    icon: ShoppingBag,
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    borderColor: "border-indigo-500",
    iconBg: "bg-indigo-600 text-white",
    linkHref: "/sales/orders",
    dbFilterKey: "status=CONFIRMED",
  },
  {
    id: "INVOICE_SENT",
    stepNumber: 5,
    title: "Invoice Creation",
    subtitle: "Invoice created & sent",
    icon: Send,
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    borderColor: "border-amber-500",
    iconBg: "bg-amber-600 text-white",
    linkHref: "/sales/invoices",
    dbFilterKey: "status=SENT",
  },
  {
    id: "PAYMENT_STATUS",
    stepNumber: 6,
    title: "Payment Receipt",
    subtitle: "Receipt or non-receipt of payment",
    icon: CreditCard,
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    borderColor: "border-teal-500",
    iconBg: "bg-teal-600 text-white",
    linkHref: "/sales/invoices?status=PAID",
    dbFilterKey: "status=PAID",
  },
];

type Props = {
  activeStep?: CustomerJourneyStepId;
  onStepSelect?: (stepId: CustomerJourneyStepId) => void;
};

export function CustomerJourneyPipeline({ activeStep = "ALL", onStepSelect }: Props) {
  const [selected, setSelected] = useState<CustomerJourneyStepId>(activeStep);

  function handleSelect(stepId: CustomerJourneyStepId) {
    setSelected(stepId);
    if (onStepSelect) {
      onStepSelect(stepId);
    }
  }

  return (
    <Card className="border shadow-sm bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-700/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <CardTitle className="text-base font-semibold text-white">
            Customer Sales Journey Flow
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-slate-800 border-slate-700 text-slate-300">
            End-to-End Sales Lifecycle Pipeline
          </Badge>
        </div>
        {selected !== "ALL" && (
          <button
            onClick={() => handleSelect("ALL")}
            className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Filter className="h-3 w-3" /> Clear Filter
          </button>
        )}
      </CardHeader>
      <CardContent className="pt-4 pb-5 px-4">
        {/* Stepper Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CUSTOMER_JOURNEY_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = selected === step.id;

            return (
              <div
                key={step.id}
                onClick={() => handleSelect(step.id)}
                className={`relative flex flex-col p-3 rounded-lg border transition-all cursor-pointer group ${
                  isSelected
                    ? "bg-slate-800 border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-[1.02]"
                    : "bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800/90"
                }`}
              >
                {/* Step Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                    Step {step.stepNumber}
                  </span>
                  <div className={`p-1.5 rounded-full ${step.iconBg}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>

                {/* Step Details */}
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                  {step.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                  {step.subtitle}
                </p>

                {/* Link Shortcut */}
                <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                  <Link
                    href={step.linkHref}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-slate-300 hover:text-amber-400 font-medium inline-flex items-center gap-0.5"
                  >
                    View Module <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                  {isSelected && <Check className="h-3.5 w-3.5 text-amber-400" />}
                </div>

                {/* Connector arrow for desktop */}
                {idx < CUSTOMER_JOURNEY_STEPS.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
