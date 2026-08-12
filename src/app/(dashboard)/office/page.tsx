import { getOfficeStats } from "@/lib/actions/office";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Table2, Presentation, Mail, MessageSquare, Clock } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Office & Workspace" };

export default async function OfficePage() {
  const stats = await getOfficeStats();

  const cards = [
    {
      title: "Documents",
      value: stats.docCount,
      icon: FileText,
      href: "/office/documents",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Spreadsheets",
      value: stats.sheetCount,
      icon: Table2,
      href: "/office/spreadsheets",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Presentations",
      value: stats.presCount,
      icon: Presentation,
      href: "/office/presentations",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Unread Emails",
      value: stats.unreadEmails,
      icon: Mail,
      href: "/office/email",
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Active Channels",
      value: stats.channelCount,
      icon: MessageSquare,
      href: "/office/messaging",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Office & Workspace</h1>
        <p className="text-muted-foreground">Documents, email, and team messaging in one place</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentMessages.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                    {(msg.sender.name || msg.sender.email?.split("@")[0] || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p>
                      <span className="font-medium">{msg.sender.name || msg.sender.email?.split("@")[0] || "Unknown User"}</span>{" "}
                      <span className="text-muted-foreground">in #{msg.channel.name}</span>
                    </p>
                    <p className="text-muted-foreground truncate">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
