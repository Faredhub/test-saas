import { getSocialAnalytics } from "@/lib/actions/social";
import { SocialNav } from "../social-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, CheckCircle2, Share2, Globe } from "lucide-react";

export const metadata = { title: "Social Analytics | Marketing" };

export default async function SocialAnalyticsPage() {
  const analytics = await getSocialAnalytics().catch(() => ({
    totalPosts: 0,
    publishedPosts: 0,
    totalConnections: 0,
    providerStats: {} as Record<string, { total: number; success: number; failed: number }>,
  }));

  const successRate =
    analytics.totalPosts > 0
      ? Math.round((analytics.publishedPosts / analytics.totalPosts) * 100)
      : 100;

  const statsMap = (analytics.providerStats || {}) as Record<
    string,
    { total: number; success: number; failed: number }
  >;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Social Publishing Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Delivery breakdown, channel performance, and engagement summary.
        </p>
      </div>

      <SocialNav />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Publishing Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Successful deliveries across networks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Social Broadcasts</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.publishedPosts}</div>
            <p className="text-xs text-muted-foreground mt-1">Published posts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Connected Target Channels</CardTitle>
            <Share2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalConnections}</div>
            <p className="text-xs text-muted-foreground mt-1">Active platform accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Network Performance Breakdown</CardTitle>
          <CardDescription>Target status count per social media provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TWITTER"].map((prov) => {
              const stat = statsMap[prov] || { total: 0, success: 0, failed: 0 };
              return (
                <div key={prov} className="p-4 border rounded-lg space-y-2 bg-background">
                  <div className="font-bold text-sm flex items-center justify-between">
                    <span>{prov}</span>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Total Targets:</span> <span className="font-semibold text-foreground">{stat.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Successful:</span> <span className="font-semibold text-green-600 dark:text-green-400">{stat.success}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed:</span> <span className="font-semibold text-red-600 dark:text-red-400">{stat.failed}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
