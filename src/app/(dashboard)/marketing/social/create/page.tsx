import { getSocialConnections } from "@/lib/actions/social";
import { SocialNav } from "../social-nav";
import { CreatePostClient } from "./create-post-client";

export const metadata = { title: "Create Social Post | Marketing" };

export default async function CreateSocialPostPage() {
  const connections = await getSocialConnections().catch(() => []);
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Social Post</h1>
        <p className="text-sm text-muted-foreground">
          Compose and publish post to Facebook, Instagram, LinkedIn, and X/Twitter simultaneously.
        </p>
      </div>

      <SocialNav />
      <CreatePostClient connections={connections} />
    </div>
  );
}
