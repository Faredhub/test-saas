"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Share2,
  PlusSquare,
  Clock,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/marketing/social", icon: LayoutDashboard },
  { label: "Connected Accounts", href: "/marketing/social/accounts", icon: Share2 },
  { label: "Create Post", href: "/marketing/social/create", icon: PlusSquare },
  { label: "Scheduled Posts", href: "/marketing/social/scheduled", icon: Clock },
  { label: "Published Posts", href: "/marketing/social/published", icon: CheckCircle2 },
  { label: "Analytics", href: "/marketing/social/analytics", icon: BarChart3 },
];

export function SocialNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-1 border-b pb-3 mb-6">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/marketing/social"
            ? pathname === "/marketing/social"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
