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
        "flex h-full min-h-0 overflow-hidden w-full transition-all duration-300 relative",
        // Modern mode: continuous gradient canvas — no outer card frames
        isWindowsStyle
          ? "bg-[#eef0f8] dark:bg-[#0B0D19] p-2.5 gap-2.5"
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
          "flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 relative z-10",
          // No gap card separation — continuous surface with the gradient
          isWindowsStyle ? "gap-1.5" : ""
        )}
      >
        {/*
          Modern topbar: NO solid card box — frosted strip that inherits the
          page gradient so right-side controls feel continuous (design #3).
        */}
        <div
          className={cn(
            "shrink-0",
            isWindowsStyle
              ? "rounded-full bg-white/45 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset] dark:shadow-none"
              : ""
          )}
        >
          <Topbar />
        </div>

        {/*
          Modern home: main is a fixed-height flex child (min-h-0) that does NOT scroll.
          The Odoo home component inside is the scrollport (h-full overflow-y-auto).
          Other pages: main itself scrolls as usual.
        */}
        <main
          className={cn(
            "flex-1 min-h-0 transition-all duration-300",
            isModernHome
              ? "overflow-hidden p-0 bg-transparent border-0 shadow-none rounded-none"
              : cn(
                  "overflow-y-auto",
                  isWindowsStyle
                    ? "rounded-[1.35rem] border border-white/60 dark:border-white/10 shadow-sm bg-white/85 dark:bg-[#14162a]/90 backdrop-blur-sm text-zinc-900 dark:text-zinc-100 p-8"
                    : "bg-muted/30 p-6",
                  isHorizontal && "pt-5"
                )
          )}
        >
          {/* Height bridge so client home can use h-full for its own scrollport */}
          <div className={cn(isModernHome ? "h-full min-h-0" : undefined)}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
