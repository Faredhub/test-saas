"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadsClient } from "../leads/leads-client";
import { DealsClient } from "../deals/deals-client";
import { Users, ShoppingCart } from "lucide-react";
import { getLeads, getDeals, getSalesStats } from "@/lib/actions/sales";

type Props = {
  leadsData: Awaited<ReturnType<typeof getLeads>>;
  dealsData: Awaited<ReturnType<typeof getDeals>>;
  stats: Awaited<ReturnType<typeof getSalesStats>>;
};

export function LeadsDealsClient({ leadsData, dealsData, stats }: Props) {
  const [activeTab, setActiveTab] = useState("leads");

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "leads" || tab === "deals") {
      setActiveTab(tab);
    }
  }, []);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", val);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="space-y-6 p-6">
      {/* Premium Main Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Leads & Deals</h1>
        <p className="text-muted-foreground">
          Manage sales leads, deal qualification, and sales pipeline tracking.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="leads" className="gap-2">
            <Users className="h-4 w-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="deals" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Deals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="border-none p-0 outline-none">
          <LeadsClient initialData={leadsData} stats={stats} hideHeader />
        </TabsContent>

        <TabsContent value="deals" className="border-none p-0 outline-none">
          <DealsClient initialData={dealsData} hideHeader />
        </TabsContent>
      </Tabs>
    </div>
  );
}
