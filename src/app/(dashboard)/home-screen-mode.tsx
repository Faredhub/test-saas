"use client";

import React, { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebarStore } from "@/stores/sidebar-store";
import {
  useNavigationCategories,
  getAppIconColor,
  getAppIconSoftBg,
} from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

/**
 * Odoo-inspired home app launcher (Modern navigation mode).
 * Soft lavender canvas + squircle tiles.
 * Search lives only in the topbar (single search bar — design #3).
 * Topbar writes shellSearchQuery; this grid filters from it.
 */
export function HomeScreenMode() {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const shellSearchQuery = useSidebarStore((s) => s.shellSearchQuery);
  const categories = useNavigationCategories();

  const allApps = useMemo(() => {
    const apps: {
      name: string;
      href: string;
      icon: React.ComponentType<{ className?: string }>;
      categoryLabel: string;
      categoryKey: string;
    }[] = [];
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (apps.some((a) => a.href === item.href)) return;
        apps.push({
          name: item.name,
          href: item.href,
          icon: item.icon,
          categoryLabel: cat.label,
          categoryKey: cat.key,
        });
      });
    });
    return apps;
  }, [categories]);

  const filteredApps = useMemo(() => {
    const q = shellSearchQuery.trim().toLowerCase();
    if (!q) return allApps;
    return allApps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.categoryLabel.toLowerCase().includes(q)
    );
  }, [allApps, shellSearchQuery]);

  // Only for Modern style (internally "windows")
  if (sidebarStyle !== "windows") return null;

  return (
    <div
      data-odoo-home
      className="relative h-full w-full overflow-y-auto overflow-x-hidden overscroll-y-contain select-none"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* Transparent — inherits shell gradient for continuity (design #3) */}
      <div className="pointer-events-none absolute inset-0 min-h-full -z-10" />

      {/* Accent bar only — no second search field */}
      <div className="sticky top-0 z-20 bg-transparent pt-2 pb-1">
        <div className="mx-auto h-1 w-36 max-w-[36%] rounded-full bg-gradient-to-r from-cyan-300/70 via-sky-300/80 to-teal-200/70 dark:from-cyan-500/35 dark:via-sky-500/40 dark:to-teal-500/35" />
        {shellSearchQuery.trim() && (
          <p className="mt-3 text-center text-xs text-slate-500 dark:text-zinc-500">
            Filtering apps for &ldquo;{shellSearchQuery.trim()}&rdquo; · use the
            top search bar
          </p>
        )}
      </div>

      {/* App grid — squircle tiles */}
      <div className="px-4 sm:px-8 md:px-12 pt-5 pb-4">
        <AnimatePresence mode="wait">
          {filteredApps.length > 0 ? (
            <motion.div
              key={shellSearchQuery || "all"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mx-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-6 gap-y-8 sm:gap-x-8 sm:gap-y-10 max-w-5xl w-full justify-items-center"
            >
              {filteredApps.map((app) => {
                const Icon = app.icon;
                const iconColor = getAppIconColor(app.name);
                const softBg = getAppIconSoftBg(app.name);

                return (
                  <div
                    key={app.href}
                    className="group w-full max-w-[96px] flex flex-col items-center"
                  >
                    <Link
                      href={app.href}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", app.href);
                      }}
                      className="flex flex-col items-center w-full cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 rounded-[1.35rem]"
                    >
                      <div
                        className={cn(
                          "relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.35rem] bg-white dark:bg-zinc-900/90",
                          "shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]",
                          "border border-white dark:border-white/10",
                          "transition-all duration-200 ease-out",
                          "group-hover:-translate-y-1 group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.12),0_4px_8px_rgba(15,23,42,0.06)]",
                          "group-active:translate-y-0 group-active:scale-[0.97]"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute inset-2 rounded-[1rem] opacity-60 dark:opacity-40",
                            softBg
                          )}
                        />
                        <Icon
                          className={cn(
                            "relative z-10 h-8 w-8 shrink-0 transition-transform duration-200 group-hover:scale-105",
                            iconColor
                          )}
                        />
                      </div>

                      <span className="mt-2.5 text-center text-[12px] font-medium leading-tight text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors px-0.5 line-clamp-2 w-full">
                        {app.name}
                      </span>
                    </Link>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                No apps match &ldquo;{shellSearchQuery.trim()}&rdquo;
              </p>
              <p className="mt-2 text-xs text-slate-400 dark:text-zinc-600">
                Clear the top search bar to see all apps
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="pb-16 pt-4 text-center text-[11px] text-slate-400 dark:text-zinc-600">
        Drag an app onto the sidebar to pin it · {filteredApps.length} apps
      </p>
    </div>
  );
}

export function HomeScreenBottomCards({ children }: { children: React.ReactNode }) {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  // Modern mode: app grid only (Odoo-style home)
  if (sidebarStyle === "windows") {
    return null;
  }

  return <>{children}</>;
}

/** Hides the welcome header on Modern home (Odoo-style clean launcher) */
export function HomeWelcome({ children }: { children: React.ReactNode }) {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <>{children}</>;
  if (sidebarStyle === "windows") return null;
  return <>{children}</>;
}
