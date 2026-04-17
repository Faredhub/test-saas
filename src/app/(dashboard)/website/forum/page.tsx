import { getForumTopics } from "@/lib/actions/website";
import { ForumClient } from "./forum-client";

export const metadata = { title: "Forum" };

export default async function ForumPage() {
  const topics = await getForumTopics();
  return <ForumClient initialTopics={topics} />;
}
