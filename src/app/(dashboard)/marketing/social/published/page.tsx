import { getSocialPosts } from "@/lib/actions/social";
import { SocialNav } from "../social-nav";
import { PublishedClient } from "./published-client";

export const metadata = { title: "Published Posts | Social Publishing" };

export default async function PublishedPostsPage() {
  const posts = await getSocialPosts("PUBLISHED").catch(() => []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Published Posts</h1>
        <p className="text-sm text-muted-foreground">
          View broadcasted post history and retry target failures.
        </p>
      </div>

      <SocialNav />
      <PublishedClient initialPosts={posts} />
    </div>
  );
}
