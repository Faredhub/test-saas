"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
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
 * Soft lavender canvas, white icon tiles, colorful icons, centered grid.
 */
export function HomeScreenMode() {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const categories = useNavigationCategories();

  const [searchQuery, setSearchQuery] = useState("");

  const allApps = useMemo(() => {
    const apps: {
      name: string;
      href: string;
      icon: React.ComponentType<{ className?: string }>;
      categoryLabel: string;
    }[] = [];
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (apps.some((a) => a.href === item.href)) return;
        apps.push({
          name: item.name,
          href: item.href,
          icon: item.icon,
          categoryLabel: cat.label,
        });
      });
    });
    return apps;
  }, [categories]);

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allApps;
    return allApps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.categoryLabel.toLowerCase().includes(q)
    );
  }, [allApps, searchQuery]);

  // Only for Modern style (internally "windows")
  if (sidebarStyle !== "windows") return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      data-odoo-home
      className="relative min-h-full flex flex-col select-none"
    >
      {/* Soft Odoo-like canvas — fixed so it fills the viewport while content scrolls */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(180, 190, 255, 0.35) 0%, transparent 55%), linear-gradient(160deg, #eef0f8 0%, #e4e7f4 40%, #ece8f5 100%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 dark:hidden opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99, 102, 241, 0.12) 0%, transparent 55%), linear-gradient(160deg, #14162a 0%, #0f1120 45%, #15122a 100%)",
        }}
      />

      {/* Sticky search header */}
      <div className="sticky top-0 z-20 shrink-0 bg-gradient-to-b from-[#eef0f8]/95 via-[#eef0f8]/90 to-transparent dark:from-[#14162a]/95 dark:via-[#14162a]/90 dark:to-transparent backdrop-blur-[2px] pb-2">
        {/* Thin top accent bar (Odoo-style) */}
        <div className="mx-auto mt-2 h-1 w-40 max-w-[40%] rounded-full bg-gradient-to-r from-cyan-300/80 via-sky-300/90 to-teal-200/80 dark:from-cyan-500/40 dark:via-sky-500/50 dark:to-teal-500/40" />

        <div className="flex justify-center px-6 pt-6 pb-2">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="search"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-full border border-white/70 dark:border-white/10 bg-white/80 dark:bg-white/5 pl-10 pr-10 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-sm outline-none focus:border-indigo-300 dark:focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/10 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* App grid — grows with content; parent <main> handles scroll */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-8 md:px-12 pt-6 pb-4">
        <AnimatePresence mode="wait">
          {filteredApps.length > 0 ? (
            <motion.div
              key={searchQuery || "all"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-6 gap-y-8 sm:gap-x-8 sm:gap-y-10 max-w-5xl w-full justify-items-center"
            >
              {filteredApps.map((app, idx) => {
                const Icon = app.icon;
                const iconColor = getAppIconColor(app.name);
                const softBg = getAppIconSoftBg(app.name);

                return (
                  <motion.div
                    key={app.href}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.015, 0.3), duration: 0.25 }}
                    className="group w-full max-w-[96px] flex flex-col items-center"
                  >
                    <Link
                      href={app.href}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", app.href);
                      }}
                      className="flex flex-col items-center w-full cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 rounded-2xl"
                    >
                      {/* White Odoo-style tile */}
                      <div
                        className={cn(
                          "relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-white dark:bg-zinc-900/90",
                          "shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]",
                          "border border-white dark:border-white/10",
                          "transition-all duration-200 ease-out",
                          "group-hover:-translate-y-1 group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.12),0_4px_8px_rgba(15,23,42,0.06)]",
                          "group-active:translate-y-0 group-active:scale-[0.97]"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute inset-2 rounded-xl opacity-60 dark:opacity-40",
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
                  </motion.div>
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
                No apps match &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear search
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="shrink-0 pb-8 pt-2 text-center text-[11px] text-slate-400 dark:text-zinc-600">
        Drag an app onto the sidebar to pin it for quick access
      </p>
    </motion.div>
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
