"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useNavigationCategories, getAppIconGradient } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 24;

const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 150 : -150,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -150 : 150,
    opacity: 0,
  }),
};

export function HomeScreenMode() {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const categories = useNavigationCategories();

  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);

  // Tabs are "All" + all category labels
  const tabs = useMemo(() => {
    return ["All", ...categories.map((cat) => cat.label)];
  }, [categories]);

  // Flatten all unique applications
  const allApps = useMemo(() => {
    const apps: any[] = [];
    categories.forEach((cat) => {
      cat.items.forEach((item: any) => {
        if (apps.some((a) => a.href === item.href)) return;
        apps.push({
          name: item.name,
          href: item.href,
          icon: item.icon,
          categoryKey: cat.key,
          categoryLabel: cat.label,
        });
      });
    });
    return apps;
  }, [categories]);

  // Filter apps by active tab and search query
  const filteredApps = useMemo(() => {
    return allApps.filter((app) => {
      const matchesTab = activeTab === "All" || app.categoryLabel === activeTab;
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [allApps, activeTab, searchQuery]);

  // Reset page when tab or search query changes
  useEffect(() => {
    setCurrentPage(0);
    setDirection(0);
  }, [activeTab, searchQuery]);

  // Pagination details
  const totalPages = Math.ceil(filteredApps.length / ITEMS_PER_PAGE);
  const pageApps = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return filteredApps.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredApps, currentPage]);

  const goToPage = (pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= totalPages) return;
    setDirection(pageIndex > currentPage ? 1 : -1);
    setCurrentPage(pageIndex);
  };

  // Return null if not in modern style (which is "windows" under the hood)
  if (sidebarStyle !== "windows") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col rounded-[2.5rem] bg-gradient-to-b from-[#0F1123]/95 via-[#0B0D19]/95 to-[#070810]/95 text-white border border-white/10 shadow-2xl p-6 md:p-8 overflow-hidden select-none"
    >
      {/* Background Decorative Ambient Glows */}
      <div className="absolute -left-16 -top-16 -z-10 h-64 w-64 rounded-full bg-purple-500/10 blur-[90px]" />
      <div className="absolute -right-16 -bottom-16 -z-10 h-64 w-64 rounded-full bg-blue-500/10 blur-[90px]" />

      {/* Header section: Title and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/5 relative">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-md">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Applications Launchpad
            </h2>
            <p className="text-[10px] text-white/55 font-medium uppercase tracking-wider">
              {filteredApps.length} features available — drag items to sidebar to customize!
            </p>
          </div>
        </div>

        {/* Search input bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 rounded-full border border-white/5 bg-white/5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500 focus:bg-white/10 shadow-inner transition-all duration-300"
          />
        </div>
      </div>

      {/* Category Tabs scrollable container */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-4 scrollbar-none border-b border-white/5 -mx-6 px-6 shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-white text-slate-950 shadow-md hover:bg-white/95"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Launchpad Grid Area */}
      <div className="relative flex-1 min-h-[340px] flex flex-col justify-between py-6 overflow-hidden">
        {filteredApps.length > 0 ? (
          <div className="flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`${activeTab}-${searchQuery}-${currentPage}`}
                custom={direction}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 justify-items-center w-full"
              >
                {pageApps.map((app) => {
                  const Icon = app.icon;
                  const gradientClass = getAppIconGradient(app.name);

                  return (
                    <motion.div
                      key={app.href}
                      className="group w-full max-w-[100px] flex flex-col items-center select-none"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        href={app.href}
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", app.href);
                        }}
                        className="flex flex-col items-center w-full cursor-grab active:cursor-grabbing"
                      >
                        {/* iOS Squircle App Icon Container */}
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl transform transition-all duration-300 group-hover:-translate-y-1.5 shadow-md group-hover:shadow-[0_12px_25px_rgba(0,0,0,0.45)]">
                          {/* Ambient Glowing Shadow Behind */}
                          <div className={cn(
                            "absolute inset-[-3px] rounded-2xl bg-gradient-to-tr blur-md opacity-45 group-hover:opacity-80 group-hover:blur-lg transition-all duration-300 pointer-events-none",
                            gradientClass
                          )} />

                          {/* Primary Gradient Squircle Icon */}
                          <div
                            className={cn(
                              "relative w-full h-full rounded-2xl bg-gradient-to-tr flex items-center justify-center overflow-hidden border border-white/20 dark:border-white/10 z-10",
                              gradientClass
                            )}
                          >
                            {/* Top lighting reflection */}
                            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                            {/* Sleek hover shade */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                            
                            <Icon className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] shrink-0" />
                          </div>
                        </div>

                        <span className="mt-2.5 text-center text-[11px] font-bold text-white/70 group-hover:text-white truncate w-full transition-colors duration-200 px-1">
                          {app.name}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 flex-1">
            <p className="text-sm font-semibold text-white/40">No applications match your filter</p>
            <button
              onClick={() => { setSearchQuery(""); setActiveTab("All"); }}
              className="mt-3 text-xs font-bold text-purple-400 hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Pagination indicator dots and side arrows */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6 shrink-0 z-20">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-1 rounded-full text-white/40 hover:text-white disabled:opacity-20 disabled:hover:text-white/40 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-2">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const isActive = currentPage === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => goToPage(idx)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      isActive
                        ? "bg-white w-6 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                        : "bg-white/30 hover:bg-white/50"
                    )}
                  />
                );
              })}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              className="p-1 rounded-full text-white/40 hover:text-white disabled:opacity-20 disabled:hover:text-white/40 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
