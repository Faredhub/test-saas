"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const navPosition = useSidebarStore((s) => s.navPosition);
  const pathname = usePathname();
  const isHorizontal = navPosition === "top" || navPosition === "bottom";
  const isWindowsStyle = sidebarStyle === "windows";
  const isModernHome = isWindowsStyle && pathname === "/";

  useEffect(() => {
    useSidebarStore.persist.rehydrate();
  }, []);

  return (
    <div
      className={cn(
        "flex h-screen overflow-hidden w-full transition-all duration-300 relative",
        isWindowsStyle
          ? "bg-[#eef0f8] dark:bg-[#0B0D19] p-3 gap-3"
          : "bg-background",
        navPosition === "right" && "flex-row-reverse",
        navPosition === "top" && "flex-col",
        navPosition === "bottom" && "flex-col-reverse"
      )}
    >
      {/* Soft Odoo-like ambient background for Modern mode */}
      {isWindowsStyle && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(180, 190, 255, 0.4) 0%, transparent 55%), linear-gradient(160deg, #eef0f8 0%, #e6e8f4 50%, #ebe8f5 100%)",
            }}
          />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(99, 102, 241, 0.12) 0%, transparent 55%), linear-gradient(160deg, #0B0D19 0%, #10122a 50%, #0f0e1c 100%)",
            }}
          />
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-violet-300/20 dark:bg-violet-500/10 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] rounded-full bg-sky-300/15 dark:bg-sky-500/10 blur-[100px]" />
        </div>
      )}

      <Sidebar />
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 relative z-10",
          isWindowsStyle ? "gap-3 h-full" : ""
        )}
      >
        {/* Topbar card — lighter on modern home */}
        <div
          className={cn(
            isWindowsStyle
              ? cn(
                  "shrink-0 rounded-2xl border shadow-sm",
                  isModernHome
                    ? "bg-white/70 dark:bg-background/70 backdrop-blur-md border-white/60 dark:border-white/10"
                    : "bg-white dark:bg-background border-slate-100/80 dark:border-zinc-800/50"
                )
              : ""
          )}
        >
          <Topbar />
        </div>

        {/* Main content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-300",
            isWindowsStyle
              ? cn(
                  "rounded-2xl border shadow-sm",
                  isModernHome
                    ? "bg-transparent border-transparent shadow-none p-0 overflow-hidden"
                    : "bg-white dark:bg-background text-zinc-900 dark:text-zinc-100 border-slate-100/80 dark:border-zinc-800/50 p-8"
                )
              : "bg-muted/30 p-6",
            isHorizontal && !isModernHome && "pt-5"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
