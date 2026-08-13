import { getSocialAnalytics, getSocialPosts, getSocialConnections } from "@/lib/actions/social";
import { SocialNav } from "./social-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Share2, CheckCircle2, Clock, BarChart3, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Social Publishing Dashboard | TixelTech ERP" };

export default async function SocialDashboardPage() {
  const [analytics, recentPosts, connections] = await Promise.all([
    getSocialAnalytics().catch(() => ({ totalPosts: 0, publishedPosts: 0, totalConnections: 0, providerStats: {} })),
    getSocialPosts().catch(() => []),
    getSocialConnections().catch(() => []),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Social Publishing</h1>
          <p className="text-sm text-muted-foreground">
            Multi-network social publishing bundle (Facebook, Instagram, LinkedIn, X/Twitter)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/marketing/social/accounts">
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" /> Connect Accounts
            </Button>
          </Link>
          <Link href="/marketing/social/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Create Post
            </Button>
          </Link>
        </div>
      </div>

      <SocialNav />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
            <Share2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalConnections}</div>
            <p className="text-xs text-muted-foreground mt-1">Active platform targets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Social Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalPosts}</div>
            <p className="text-xs text-muted-foreground mt-1">Created in current workspace</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.publishedPosts}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully broadcasted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Network Bundle</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Phase 1</div>
            <p className="text-xs text-muted-foreground mt-1">3-Network Base Bundle + IG</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Bundle Status */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Phase 1 Network Bundle Status</CardTitle>
          <CardDescription>
            Supported social networks included in your current subscription bundle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TWITTER"].map((prov) => {
              const connected = connections.find((c) => c.provider === prov && c.status === "ACTIVE");
              return (
                <div key={prov} className="p-4 border rounded-lg bg-background flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{prov}</div>
                    <div className="text-xs text-muted-foreground">
                      {connected ? connected.accountName : "Not Connected"}
                    </div>
                  </div>
                  <Badge variant={connected ? "default" : "secondary"}>
                    {connected ? "Active" : "Connect"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Recent Social Posts</CardTitle>
            <CardDescription>Latest posts scheduled or published across connected channels</CardDescription>
          </div>
          <Link href="/marketing/social/published">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No social posts created yet. Click "Create Post" to publish to Facebook, Instagram, LinkedIn, and X.
            </div>
          ) : (
            <div className="space-y-3">
              {recentPosts.slice(0, 5).map((post) => (
                <div key={post.id} className="p-3 border rounded-lg flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Targets: {post.targets.map((t) => t.provider).join(", ")}</span>
                      <span>•</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      post.status === "PUBLISHED"
                        ? "default"
                        : post.status === "FAILED"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {post.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
