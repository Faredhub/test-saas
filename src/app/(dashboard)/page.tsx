import { auth } from "@/lib/auth";
import { getHomeStats } from "@/lib/actions/home";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  ShoppingCart,
  Receipt,
  UserCircle,
  ArrowRight,
  Megaphone,
  CalendarDays,
  Phone,
  Mail,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";

const activityIcons: Record<string, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: CalendarDays,
  NOTE: MessageSquare,
  TASK: ClipboardList,
  VISIT: Users,
};

const stageColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  QUALIFIED: "bg-purple-100 text-purple-700",
  PROPOSAL: "bg-amber-100 text-amber-700",
  NEGOTIATION: "bg-orange-100 text-orange-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  NORMAL: "bg-blue-100 text-blue-600",
  HIGH: "bg-amber-100 text-amber-600",
  URGENT: "bg-red-100 text-red-600",
};

export default async function HomePage() {
  const session = await auth();
  const userName = session?.user?.name?.split(" ")[0] ?? "there";

  const { stats, recentLeads, recentActivities, announcements, upcomingEvents } = await getHomeStats();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {userName}</h1>
        <p className="text-muted-foreground">Here&apos;s an overview of your business today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contacts</CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Deals</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openDeals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue (Month)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              ₹{stats.monthlyRevenue.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions (HOME-002) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Add Lead", desc: "Capture new sales lead", href: "/sales/leads", icon: Users, color: "bg-blue-100 text-blue-600" },
          { label: "Create Deal", desc: "Track a new opportunity", href: "/sales/deals", icon: ShoppingCart, color: "bg-green-100 text-green-600" },
          { label: "New Invoice", desc: "Generate an invoice", href: "/sales/invoices", icon: Receipt, color: "bg-purple-100 text-purple-600" },
          { label: "View Dashboard", desc: "Business analytics", href: "/dashboard", icon: BarChart3, color: "bg-amber-100 text-amber-600" },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Leads</CardTitle>
            <Link href="/sales/leads" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No leads yet</p>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{lead.firstName} {lead.lastName}</p>
                      <p className="text-xs text-muted-foreground">{lead.company ?? "No company"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${stageColors[lead.pipelineStage] ?? ""} border-0 text-[10px]`}>
                        {lead.pipelineStage}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((act) => {
                  const Icon = activityIcons[act.type] ?? MessageSquare;
                  return (
                    <div key={act.id} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{act.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {act.user?.name} &middot; {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Announcements (from ORG-C) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Announcements
            </CardTitle>
            <Link href="/organization/notices" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No announcements</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`${priorityColors[a.priority] ?? ""} border-0 text-[10px]`}>
                        {a.priority}
                      </Badge>
                      <p className="text-sm font-medium">{a.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Upcoming Events
            </CardTitle>
            <Link href="/organization/calendar" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">{ev.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm tabular-nums">{format(new Date(ev.startTime), "dd MMM")}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(ev.startTime), "HH:mm")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
