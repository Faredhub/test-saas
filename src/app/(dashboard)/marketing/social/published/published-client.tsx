"use client";

import { useState } from "react";
import { retrySocialPostTarget } from "@/lib/actions/social";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, RotateCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Props = {
  initialPosts: any[];
};

export function PublishedClient({ initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = async (targetId: string) => {
    setRetryingId(targetId);
    try {
      await retrySocialPostTarget(targetId);
      toast.success("Retry request executed!");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Retry failed");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Broadcast Feed</CardTitle>
        <CardDescription>Target status breakdown per platform network</CardDescription>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No published posts available yet.
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(post.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      post.status === "PUBLISHED"
                        ? "default"
                        : post.status === "PARTIALLY_PUBLISHED"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {post.status}
                  </Badge>
                </div>

                {/* Platform Target Status Badges */}
                <div className="pt-3 border-t space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Target Statuses:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {post.targets.map((target: any) => (
                      <div
                        key={target.id}
                        className="p-3 border rounded bg-muted/20 flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{target.provider}</span>
                          {target.status === "PUBLISHED" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>

                        {target.status === "FAILED" && (
                          <div className="space-y-1">
                            <p className="text-[11px] text-red-600 dark:text-red-400 truncate">
                              {target.errorMessage || "Publishing Error"}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs w-full mt-1"
                              disabled={retryingId === target.id}
                              onClick={() => handleRetry(target.id)}
                            >
                              <RotateCw className={`h-3 w-3 mr-1 ${retryingId === target.id ? "animate-spin" : ""}`} /> Retry
                            </Button>
                          </div>
                        )}

                        {target.status === "PUBLISHED" && (
                          <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                            ✓ Published
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
