"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Globe, Share2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Recruitment Workspace", href: "/hrm/recruitment", icon: Briefcase },
  { label: "Job Portals", href: "/hrm/recruitment/portals", icon: Globe },
  { label: "Job Syndication", href: "/hrm/recruitment/syndication", icon: Share2 },
  { label: "Syndication Logs", href: "/hrm/recruitment/syndication-logs", icon: FileText },
];

export function RecruitmentNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-1 border-b pb-3 mb-6">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/hrm/recruitment"
            ? pathname === "/hrm/recruitment"
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
