import { getSocialPosts } from "@/lib/actions/social";
import { SocialNav } from "../social-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";

export const metadata = { title: "Scheduled Posts | Social Publishing" };

export default async function ScheduledPostsPage() {
  const posts = await getSocialPosts("SCHEDULED").catch(() => []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scheduled Posts</h1>
        <p className="text-sm text-muted-foreground">
          View and manage pending scheduled social media publications.
        </p>
      </div>

      <SocialNav />

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Queue</CardTitle>
          <CardDescription>{posts.length} posts waiting to be broadcasted</CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No scheduled posts in queue.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{post.content}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : "Not set"}
                      </span>
                      <span>•</span>
                      <span>Targets: {post.targets.map((t) => t.provider).join(", ")}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    <Clock className="h-3 w-3 mr-1 text-amber-500" /> Scheduled
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
