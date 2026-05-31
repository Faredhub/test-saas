"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileCode,
  PenLine,
  MessageSquare,
  HelpCircle,
  Headphones,
  Globe,
  Eye,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Stats = {
  totalPages: number;
  publishedPages: number;
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalTopics: number;
  totalFAQs: number;
  publishedFAQs: number;
  totalWidgets: number;
  openConversations: number;
  totalConversations: number;
};

export function WebsiteOverviewClient({ stats }: { stats: Stats }) {
  const cards = [
    {
      title: "Web Pages",
      value: stats.totalPages,
      sub: `${stats.publishedPages} published`,
      icon: FileCode,
      href: "/website/pages",
      color: "text-blue-500",
    },
    {
      title: "Blog Posts",
      value: stats.totalPosts,
      sub: `${stats.publishedPosts} published, ${stats.draftPosts} drafts`,
      icon: PenLine,
      href: "/website/blog",
      color: "text-green-500",
    },
    {
      title: "Forum Topics",
      value: stats.totalTopics,
      sub: "Community discussions",
      icon: MessageSquare,
      href: "/website/forum",
      color: "text-purple-500",
    },
    {
      title: "FAQ Items",
      value: stats.totalFAQs,
      sub: `${stats.publishedFAQs} published`,
      icon: HelpCircle,
      href: "/website/faq",
      color: "text-amber-500",
    },
    {
      title: "Chat Widgets",
      value: stats.totalWidgets,
      sub: `${stats.openConversations} open conversations`,
      icon: Headphones,
      href: "/website/chat",
      color: "text-cyan-500",
    },
    {
      title: "Total Conversations",
      value: stats.totalConversations,
      sub: `${stats.openConversations} need attention`,
      icon: Eye,
      href: "/website/chat",
      color: "text-rose-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Website & CMS</h1>
          <p className="text-muted-foreground">
            Manage pages, blog, forum, FAQ, and live chat
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {cards.map((card) => (
    <Card key={card.title} className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {card.title}
        </CardTitle>
        <card.icon className={`h-4 w-4 ${card.color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{card.value}</div>
        <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
        <Link href={card.href}>
          <Button variant="ghost" size="sm" className="mt-3 -ml-2 group hover:bg-primary/10 transition-colors duration-150">
            View details 
            <ArrowRight className="ml-1 h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  ))}
</div>
    </div>
  );
}
