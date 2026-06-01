"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import {
  Bell,
  Search,
  Menu,
  Moon,
  Sun,
  Monitor,
  Check,
  LayoutDashboard,
  PanelLeft,
  PanelTop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarStore } from "@/stores/sidebar-store";
import { signOut } from "next-auth/react";
import { globalSearch } from "@/lib/actions/user";
import { updateUserTheme } from "@/lib/actions/user";
import { markAllNotificationsRead, getNotifications, markNotificationRead } from "@/lib/actions/notifications";
import Link from "next/link";
import { useTheme } from "next-themes";

export function Topbar() {
  const { user } = useCurrentUser();
  const toggleMobile = useSidebarStore((s) => s.toggleMobile);
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const setSidebarStyle = useSidebarStore((s) => s.setSidebarStyle);
  const navPosition = useSidebarStore((s) => s.navPosition);
  const setNavPosition = useSidebarStore((s) => s.setNavPosition);
  const [isPending, startTransition] = useTransition();

  // Global Search (HOME-005)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ type: string; id: string; label: string; sub?: string | null; href: string }[]>([]);
  const [showResults, setShowResults] = useState(false);

  const doSearch = useCallback((q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    startTransition(async () => {
      const { results } = await globalSearch(q);
      setSearchResults(results);
      setShowResults(true);
    });
  }, [startTransition]);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  // Theme (HOME-006)
  // function handleThemeChange(theme: "LIGHT" | "DARK" | "SYSTEM") {
  //   startTransition(async () => {
  //     await updateUserTheme(theme);
  //     if (theme === "DARK") document.documentElement.classList.add("dark");
  //     else if (theme === "LIGHT") document.documentElement.classList.remove("dark");
  //     else {
  //       const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  //       document.documentElement.classList.toggle("dark", prefersDark);
  //     }
  //   });
  // }

  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, systemTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Notifications — fetch unread + recent list, refresh every 30s.
  type NotifRow = {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: Date | string;
  };
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [unread, setUnread] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const { notifications, unreadCount } = await getNotifications(15);
      setNotifs(notifications as unknown as NotifRow[]);
      setUnread(unreadCount);
    } catch {
      // Silent on transient errors; next tick will retry.
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 30000);
    return () => clearInterval(id);
  }, [loadNotifications]);

  function handleMarkRead(id: string) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    startTransition(() => markNotificationRead(id));
  }

  function handleMarkAll() {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    startTransition(() => markAllNotificationsRead());
  }

  function formatNotifTime(iso: Date | string) {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const m = Math.round(diffMs / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    return d.toLocaleDateString();
  }

  const isDark = mounted && theme === 'dark';

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleMobile}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Global Search (HOME-005) */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search across all modules..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border bg-popover shadow-lg">
            {searchResults.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                href={r.href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                onClick={() => { setShowResults(false); setSearchQuery(""); }}
              >
                <Badge variant="outline" className="text-[10px] uppercase w-20 justify-center shrink-0">
                  {r.type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{r.label}</p>
                  {r.sub && <p className="truncate text-xs text-muted-foreground">{r.sub}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
        {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !isPending && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover p-4 text-sm text-muted-foreground text-center shadow-lg">
            No results found
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Navigation Mode */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm hover:bg-muted">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden xl:inline">Navigation</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Style</DropdownMenuLabel>
            {[
              { value: "modern", label: "Dock" },
              { value: "classic", label: "Classic" },
              { value: "windows", label: "Modern" },
            ].map((item) => (
              <DropdownMenuItem
                key={item.value}
                onClick={() => setSidebarStyle(item.value as "modern" | "classic" | "windows")}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${sidebarStyle === item.value ? "opacity-100" : "opacity-0"
                    }`}
                />
                {item.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Position</DropdownMenuLabel>
            {[
              { value: "left", label: "Left", icon: PanelLeft },
              { value: "right", label: "Right", icon: PanelLeft },
              { value: "top", label: "Top", icon: PanelTop },
              { value: "bottom", label: "Bottom", icon: PanelTop },
            ].map((item) => (
              <DropdownMenuItem
                key={item.value}
                onClick={() => setNavPosition(item.value as "left" | "right" | "top" | "bottom")}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${navPosition === item.value ? "opacity-100" : "opacity-0"
                    }`}
                />
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {item.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <Link href="/settings/onboarding" className="block">
              <DropdownMenuItem>Industry Onboarding</DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle (HOME-006) */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={`relative inline-flex h-8 w-16 items-center justify-between rounded-full px-1.5 transition-all duration-300 hover:scale-105 outline-none cursor-pointer ${
            isDark 
              ? "bg-slate-900 border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_1px_2px_rgba(255,255,255,0.05)] hover:bg-slate-800 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_12px_rgba(255,255,255,0.15)]" 
              : "bg-[#60a5fa] border border-blue-400/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.05)] hover:bg-blue-500 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_0_12px_rgba(96,165,250,0.4)]"
          }`}
          aria-label="Toggle theme"
        >
          <Sun className={`h-4 w-4 transition-all duration-300 ${!isDark ? "text-yellow-500" : "text-gray-400"
            }`} />
          <Moon className={`h-4 w-4 transition-all duration-300 ${isDark ? "text-white" : "text-black"
            }`} />
          <span
            className={`absolute h-6 w-6 rounded-full bg-white transition-all duration-500 ${
              isDark 
                ? "translate-x-7 shadow-[0_0_10px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.4)]" 
                : "translate-x-0 shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
            }`}
          />
        </button>

        {/* Notifications (HOME-003) */}
        <DropdownMenu onOpenChange={(open) => { if (open) loadNotifications(); }}>
          <DropdownMenuTrigger className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications {unread > 0 && <span className="text-xs text-muted-foreground">({unread} unread)</span>}</span>
              {unread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleMarkAll}
                >
                  <Check className="mr-1 h-3 w-3" /> Mark all read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifs.map((n) => {
                  const Inner = (
                    <div
                      key={n.id}
                      className={`flex items-start gap-2 px-3 py-2 hover:bg-muted/60 cursor-pointer ${n.isRead ? "opacity-70" : ""}`}
                      onClick={() => !n.isRead && handleMarkRead(n.id)}
                    >
                      {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{formatNotifTime(n.createdAt)}</div>
                      </div>
                    </div>
                  );
                  return n.link ? (
                    <Link key={n.id} href={n.link} className="block" onClick={() => !n.isRead && handleMarkRead(n.id)}>
                      {Inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{Inner}</div>
                  );
                })}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu (HOME-004) */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full outline-none hover:bg-muted">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name ?? "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/profile" className="block">
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            </Link>
            <Link href="/organization/settings" className="block">
              <DropdownMenuItem>Organization</DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
