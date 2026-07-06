"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Briefcase,
  CalendarDays,
  Clock,
  Car,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { getHrmStats } from "@/lib/actions/hrm";

type Stats = Awaited<ReturnType<typeof getHrmStats>>;

export function HrmClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getHrmStats();
        setStats(data);
      } catch {
        // silently fail
      }
    });
  }, []);

  const cards = [
    {
      title: "Total Active Employees",
      value: stats?.activeEmployees ?? 0,
      subtitle: `${stats?.totalEmployees ?? 0} total`,
      icon: Users,
      href: "/hrm/employees",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Pending Leaves",
      value: stats?.pendingLeaves ?? 0,
      subtitle: "Awaiting approval",
      icon: CalendarDays,
      href: "/hrm/leaves",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Open Positions",
      value: stats?.openPositions ?? 0,
      subtitle: "Active job postings",
      icon: Briefcase,
      href: "/hrm/recruitment",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Today's Attendance",
      value: stats?.todayAttendance ?? 0,
      subtitle: `of ${stats?.activeEmployees ?? 0} employees`,
      icon: Clock,
      href: "/hrm/attendance",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Fleet Vehicles",
      value: stats?.totalVehicles ?? 0,
      subtitle: "Registered vehicles",
      icon: Car,
      href: "/hrm/fleet",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  const quickLinks = [
    { label: "Employee Directory", href: "/hrm/employees", icon: Users },
    { label: "Recruitment", href: "/hrm/recruitment", icon: Briefcase },
    { label: "Leave Management", href: "/hrm/leaves", icon: CalendarDays },
    { label: "Attendance Tracker", href: "/hrm/attendance", icon: Clock },
    { label: "Fleet Management", href: "/hrm/fleet", icon: Car },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Human Resource</h1>
        <p className="text-muted-foreground">
          Manage employees, recruitment, leaves, attendance, and fleet
        </p>
      </div>

      {isPending && !stats ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cards.map((card) => (
              <Link key={card.title} href={card.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{card.title}</p>
                        <p className="text-3xl font-bold mt-1">{card.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                      </div>
                      <div className={`rounded-lg p-3 ${card.bg}`}>
                        <card.icon className={`h-6 w-6 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quickLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-auto py-4"
                    >
                      <span className="flex items-center gap-2">
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
