"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { Bell, Search, Menu, Moon, Sun, Monitor, Check, X } from "lucide-react";
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
import { signOut } from "next-auth/react";
import { globalSearch } from "@/lib/actions/user";
import { updateUserTheme } from "@/lib/actions/user";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import Link from "next/link";

export function Topbar() {
  const { user } = useCurrentUser();
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
  function handleThemeChange(theme: "LIGHT" | "DARK" | "SYSTEM") {
    startTransition(async () => {
      await updateUserTheme(theme);
      if (theme === "DARK") document.documentElement.classList.add("dark");
      else if (theme === "LIGHT") document.documentElement.classList.remove("dark");
      else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.classList.toggle("dark", prefersDark);
      }
    });
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-6">
      <Button variant="ghost" size="icon" className="lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Global Search (HOME-005) */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads, contacts, deals..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg">
            {searchResults.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                href={r.href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                onClick={() => { setShowResults(false); setSearchQuery(""); }}
              >
                <Badge variant="outline" className="text-[10px] uppercase w-16 justify-center">
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
        {/* Theme Toggle (HOME-006) */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleThemeChange("LIGHT")}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("DARK")}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("SYSTEM")}>
              <Monitor className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications (HOME-003) */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted">
            <Bell className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => startTransition(() => markAllNotificationsRead())}
              >
                <Check className="mr-1 h-3 w-3" /> Mark all read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
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
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/organization/settings">Organization</Link>
            </DropdownMenuItem>
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
