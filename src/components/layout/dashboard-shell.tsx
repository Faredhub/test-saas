"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const navPosition = useSidebarStore((s) => s.navPosition);
  const isHorizontal = navPosition === "top" || navPosition === "bottom";

  return (
    <div
      className={cn(
        "flex h-screen overflow-hidden",
        navPosition === "right" && "flex-row-reverse",
        navPosition === "top" && "flex-col",
        navPosition === "bottom" && "flex-col-reverse"
      )}
    >
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main
          className={cn(
            "flex-1 overflow-y-auto bg-muted/30 p-6",
            isHorizontal && "pt-5"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
