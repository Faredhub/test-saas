"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, X, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebarStore } from "@/stores/sidebar-store";
import {
  useNavigationCategories,
  getAppIconColor,
  getAppIconSoftBg,
} from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Odoo-inspired home app launcher (Modern navigation mode).
 * Soft lavender canvas, squircle icon tiles, dual-search architecture:
 *  - Topbar: global module search (left)
 *  - Home: app name filter (consistent sticky spot)
 */
export function HomeScreenMode() {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const categories = useNavigationCategories();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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
    const q = searchQuery.trim().toLowerCase();
    return allApps.filter((app) => {
      if (categoryFilter !== "all" && app.categoryKey !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        app.name.toLowerCase().includes(q) ||
        app.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [allApps, searchQuery, categoryFilter]);

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

      {/* Sticky app search — same spot regardless of module navigation */}
      <div className="sticky top-0 z-20 bg-transparent">
        <div className="mx-auto mt-1.5 h-1 w-36 max-w-[36%] rounded-full bg-gradient-to-r from-cyan-300/70 via-sky-300/80 to-teal-200/70 dark:from-cyan-500/35 dark:via-sky-500/40 dark:to-teal-500/35" />

        <div className="flex justify-center px-6 pt-4 pb-2">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <input
              type="search"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-full border border-white/70 dark:border-white/10 bg-white/70 dark:bg-white/5 pl-10 pr-[4.25rem] text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-sm outline-none focus:border-indigo-300 dark:focus:border-indigo-500/50 focus:bg-white/90 dark:focus:bg-white/10 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-9 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {/* 3-dot advanced filter for apps */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors outline-none",
                  categoryFilter !== "all" &&
                    "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15"
                )}
                aria-label="Filter apps by module"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 max-h-72 overflow-y-auto">
                <DropdownMenuLabel>Filter by module</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCategoryFilter("all")}>
                  All modules{categoryFilter === "all" ? " ✓" : ""}
                </DropdownMenuItem>
                {categories.map((cat) => (
                  <DropdownMenuItem
                    key={cat.key}
                    onClick={() => setCategoryFilter(cat.key)}
                  >
                    {cat.label}
                    {categoryFilter === cat.key ? " ✓" : ""}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* App grid — squircle tiles */}
      <div className="px-4 sm:px-8 md:px-12 pt-5 pb-4">
        <AnimatePresence mode="wait">
          {filteredApps.length > 0 ? (
            <motion.div
              key={`${searchQuery}-${categoryFilter}`}
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
                          // Squircle app tiles (design #3)
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
                No apps match &ldquo;{searchQuery || categoryFilter}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                }}
                className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear filters
              </button>
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
