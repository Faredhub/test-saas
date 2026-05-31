"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  MousePointerClick,
  Eye,
  Send,
  Calendar,
  ClipboardList,
  ArrowRight,
  Users,
  Megaphone,
} from "lucide-react";
import Link from "next/link";

type CampaignStats = {
  totalCampaigns: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  draft: number;
  scheduled: number;
  sent: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SurveyItem = any;

type Props = {
  campaignStats: CampaignStats;
  upcomingEvents: EventItem[];
  recentSurveys: SurveyItem[];
};

const eventStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PUBLISHED: "bg-blue-100 text-blue-700",
  ONGOING: "bg-green-100 text-green-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export function MarketingOverviewClient({
  campaignStats,
  upcomingEvents,
  recentSurveys,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing</h1>
          <p className="text-muted-foreground">
            Campaigns, events, and surveys overview
          </p>
        </div>
      </div>

      {/* Campaign stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaignStats.totalSent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {campaignStats.sent} campaigns sent
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignStats.openRate}%</div>
            <p className="text-xs text-muted-foreground">
              {campaignStats.totalOpened.toLocaleString()} total opened
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignStats.clickRate}%</div>
            <p className="text-xs text-muted-foreground">
              {campaignStats.totalClicked.toLocaleString()} total clicked
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignStats.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {campaignStats.draft} draft, {campaignStats.scheduled} scheduled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/marketing/campaigns">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-blue-100 p-3">
                <Mail className="h-6 w-6 text-blue-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Campaigns</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage email, SMS, WhatsApp campaigns
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/marketing/events">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-green-100 p-3">
                <Calendar className="h-6 w-6 text-green-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Events</h3>
                <p className="text-sm text-muted-foreground">
                  Conferences, webinars, workshops, and meetups
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/marketing/surveys">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-purple-100 p-3">
                <ClipboardList className="h-6 w-6 text-purple-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Surveys</h3>
                <p className="text-sm text-muted-foreground">
                  Create surveys and collect feedback
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Events</CardTitle>
            <Link href="/marketing/events">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event: EventItem) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.startDate).toLocaleDateString()} &middot;{" "}
                        {event.venue || "Online"}
                      </p>
                    </div>
                    <div className="ml-2 flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {event.attendees?.length ?? 0}
                        {event.capacity ? `/${event.capacity}` : ""}
                      </div>
                      <Badge
                        className={
                          eventStatusColors[event.status] || eventStatusColors.DRAFT
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent surveys */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Surveys</CardTitle>
            <Link href="/marketing/surveys">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentSurveys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No surveys yet</p>
            ) : (
              <div className="space-y-3">
                {recentSurveys.map((survey: SurveyItem) => (
                  <div
                    key={survey.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{survey.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {survey._count?.responses ?? 0} responses
                      </p>
                    </div>
                    <Badge
                      className={
                        survey.isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {survey.isPublished ? "Published" : "Draft"}
                    </Badge>
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
