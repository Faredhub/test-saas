"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import {
  Bell,
  Search,
  Menu,
  Moon,
  Sun,
  Check,
  LayoutDashboard,
  PanelLeft,
  PanelTop,
  MoreHorizontal,
  MessageSquare,
  Filter,
  User,
  Building2,
  FileText,
  Package,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarStore } from "@/stores/sidebar-store";
import { signOut } from "next-auth/react";
import { globalSearch, updateUserTheme, getUserAvatar } from "@/lib/actions/user";
import { markAllNotificationsRead, getNotifications, markNotificationRead } from "@/lib/actions/notifications";
import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { user } = useCurrentUser();
  const toggleMobile = useSidebarStore((s) => s.toggleMobile);
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const setSidebarStyle = useSidebarStore((s) => s.setSidebarStyle);
  const navPosition = useSidebarStore((s) => s.navPosition);
  const setNavPosition = useSidebarStore((s) => s.setNavPosition);
  const [isPending, startTransition] = useTransition();

  const [avatar, setAvatar] = useState<string | null>(null);

  const fetchAvatar = useCallback(() => {
    if (user?.id) {
      getUserAvatar()
        .then(setAvatar)
        .catch(() => setAvatar(null));
    } else {
      setAvatar(null);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAvatar();
    window.addEventListener("avatar-updated", fetchAvatar);
    return () => window.removeEventListener("avatar-updated", fetchAvatar);
  }, [fetchAvatar]);

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
  const prevUnreadRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [bellPing, setBellPing] = useState(false);

  // Synthesize a soft two-tone chime via Web Audio (no file hosting needed).
  // Lazily creates the AudioContext on first call; browsers gate this on a
  // user gesture, but by the time a notification arrives the user has
  // typically interacted with the page at least once.
  const playChime = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();

      const now = ctx.currentTime;
      const playTone = (freq: number, start: number, duration: number, peak = 0.18) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(peak, now + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration + 0.05);
      };
      // Two-note chime: G5 -> C6 (rising). Soft, short.
      playTone(783.99, 0, 0.32);
      playTone(1046.5, 0.12, 0.38);
    } catch {
      // Audio playback can fail under autoplay policies; degrade silently.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const { notifications, unreadCount } = await getNotifications(15);
      setNotifs(notifications as unknown as NotifRow[]);
      setUnread((prev) => {
        const previous = prevUnreadRef.current ?? prev;
        if (prevUnreadRef.current !== null && unreadCount > previous) {
          playChime();
          setBellPing(true);
          setTimeout(() => setBellPing(false), 1800);
        }
        prevUnreadRef.current = unreadCount;
        return unreadCount;
      });
    } catch {
      // Silent on transient errors; next tick will retry.
    }
  }, [playChime]);

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

  const isWindowsStyle = sidebarStyle === "windows";
  const [searchFilter, setSearchFilter] = useState<string>("all");

  const filteredResults = searchFilter === "all"
    ? searchResults
    : searchResults.filter((r) => r.type.toLowerCase() === searchFilter.toLowerCase());

  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-3",
        isWindowsStyle
          ? "h-14 bg-transparent border-none px-3 sm:px-4"
          : "h-16 border-b bg-background px-6 gap-4"
      )}
    >
      <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={toggleMobile}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Global Search — left-aligned, pill, 3-dot advanced filter (design #3) */}
      <div className={cn("relative min-w-0", isWindowsStyle ? "flex-1 max-w-xl" : "flex-1 max-w-md")}>
        <Search
          className={cn(
            "absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none",
            isWindowsStyle && "text-slate-400 dark:text-zinc-500"
          )}
        />
        <Input
          placeholder="Search across all modules..."
          className={cn(
            isWindowsStyle
              ? "h-10 pl-10 pr-11 rounded-full border-white/70 dark:border-white/10 bg-white/75 dark:bg-white/5 shadow-none focus-visible:ring-1 focus-visible:ring-indigo-300/60"
              : "pl-9"
          )}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {/* Advanced filter (3-dot) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors outline-none",
              searchFilter !== "all" && "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15"
            )}
            aria-label="Advanced search filters"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" />
              Search filter
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { value: "all", label: "All modules", icon: LayoutDashboard },
              { value: "lead", label: "Leads / CRM", icon: User },
              { value: "contact", label: "Contacts", icon: User },
              { value: "document", label: "Documents", icon: FileText },
              { value: "product", label: "Products", icon: Package },
              { value: "employee", label: "People", icon: Building2 },
            ].map((f) => (
              <DropdownMenuItem
                key={f.value}
                onClick={() => setSearchFilter(f.value)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    searchFilter === f.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <f.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {f.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {showResults && filteredResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-white/60 dark:border-white/10 bg-popover/95 backdrop-blur-xl shadow-xl">
            {filteredResults.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                href={r.href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors first:rounded-t-2xl last:rounded-b-2xl"
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
        {showResults && searchQuery.length >= 2 && filteredResults.length === 0 && !isPending && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-2xl border bg-popover p-4 text-sm text-muted-foreground text-center shadow-lg">
            No results found
          </div>
        )}
      </div>

      {/*
        Right-side control cluster (design #3):
        Navigation · Theme · Messaging · Notifications · Profile
        No boxed separation — continuous flex strip matching the topbar gradient.
      */}
      <div
        className={cn(
          "ml-auto flex items-center shrink-0",
          isWindowsStyle ? "gap-0.5 sm:gap-1" : "gap-2"
        )}
      >
        {/* Navigation Mode */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "inline-flex items-center justify-center gap-1.5 text-sm outline-none transition-colors",
              isWindowsStyle
                ? "h-9 rounded-full px-2.5 text-slate-600 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/10"
                : "h-9 rounded-md px-3 hover:bg-muted"
            )}
          >
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
          className={cn(
            "relative inline-flex items-center justify-between rounded-full px-1.5 transition-all duration-300 outline-none cursor-pointer",
            isWindowsStyle ? "h-7 w-14 hover:scale-[1.03]" : "h-8 w-16 hover:scale-105",
            isDark
              ? "bg-slate-900/90 border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
              : "bg-[#60a5fa] border border-blue-400/30 shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
          )}
          aria-label="Toggle theme"
          suppressHydrationWarning
        >
          <Sun className={cn("h-3.5 w-3.5 transition-all duration-300", !isDark ? "text-yellow-300" : "text-gray-500")} />
          <Moon className={cn("h-3.5 w-3.5 transition-all duration-300", isDark ? "text-white" : "text-black/40")} />
          <span
            className={cn(
              "absolute rounded-full bg-white transition-all duration-500",
              isWindowsStyle ? "h-5 w-5" : "h-6 w-6",
              isDark
                ? (isWindowsStyle ? "translate-x-6" : "translate-x-7") + " shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                : "translate-x-0 shadow-sm"
            )}
          />
        </button>

        {/* Messaging */}
        <Link
          href="/office/messaging"
          className={cn(
            "inline-flex items-center justify-center transition-colors outline-none",
            isWindowsStyle
              ? "h-9 w-9 rounded-full text-slate-500 dark:text-zinc-400 hover:bg-black/[0.04] dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white"
              : "h-9 w-9 rounded-md hover:bg-muted"
          )}
          aria-label="Messaging"
          title="Messaging"
        >
          <MessageSquare className="h-4.5 w-4.5 h-[1.125rem] w-[1.125rem]" />
        </Link>

        {/* Notifications (HOME-003) */}
        <DropdownMenu onOpenChange={(open) => { if (open) loadNotifications(); }}>
          <DropdownMenuTrigger
            className={cn(
              "relative inline-flex items-center justify-center transition-colors outline-none",
              isWindowsStyle
                ? "h-9 w-9 rounded-full text-slate-500 dark:text-zinc-400 hover:bg-black/[0.04] dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white"
                : "h-9 w-9 rounded-md hover:bg-muted",
              unread > 0 && "text-indigo-600 dark:text-indigo-400",
              bellPing && "animate-bell-shake"
            )}
            aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <>
                <span className="absolute inset-0 rounded-full ring-2 ring-indigo-400/30 animate-pulse pointer-events-none" />
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white shadow ring-2 ring-transparent">
                  {unread > 9 ? "9+" : unread}
                </span>
              </>
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
          <DropdownMenuTrigger
            className={cn(
              "relative flex items-center justify-center rounded-full outline-none transition-colors",
              isWindowsStyle
                ? "h-9 w-9 hover:ring-2 hover:ring-indigo-300/40 dark:hover:ring-indigo-500/30"
                : "h-9 w-9 hover:bg-muted"
            )}
          >
            <Avatar className={cn(isWindowsStyle ? "h-8 w-8" : "h-9 w-9")}>
              {avatar && <AvatarImage src={avatar} alt={user?.name ?? "User"} />}
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
