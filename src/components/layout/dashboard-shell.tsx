"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const navPosition = useSidebarStore((s) => s.navPosition);
  const isHorizontal = navPosition === "top" || navPosition === "bottom";
  const isWindowsStyle = sidebarStyle === "windows";

  useEffect(() => {
    useSidebarStore.persist.rehydrate();
  }, []);

  return (
    <div
      className={cn(
        "flex h-screen overflow-hidden w-full transition-all duration-300 relative",
        isWindowsStyle ? "bg-slate-50 dark:bg-[#0B0D19] p-4 gap-4" : "bg-background",
        navPosition === "right" && "flex-row-reverse",
        navPosition === "top" && "flex-col",
        navPosition === "bottom" && "flex-col-reverse"
      )}
    >
      {/* 🌌 Premium Ambient Radial Glows (Easy UI Background Polish) */}
      {isWindowsStyle && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] rounded-full bg-purple-500/10 dark:bg-purple-500/15 blur-[120px] animate-pulse" />
          <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px]" />
        </div>
      )}

      <Sidebar />
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300",
          isWindowsStyle ? "gap-4 h-full" : ""
        )}
      >
        {/* Navbar Card */}
        <div
          className={cn(
            isWindowsStyle
              ? "bg-white dark:bg-background rounded-[1.5rem] shadow-md border border-slate-100/50 dark:border-zinc-800/50 shrink-0"
              : ""
          )}
        >
          <Topbar />
        </div>

        {/* Main Content Card */}
        <main
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-300",
            isWindowsStyle 
              ? "bg-white dark:bg-background text-zinc-900 dark:text-zinc-100 rounded-[1.5rem] shadow-md border border-slate-100/50 dark:border-zinc-800/50 p-8" 
              : "bg-muted/30 p-6",
            isHorizontal && "pt-5"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
