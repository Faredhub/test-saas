import {
  getChatWidgets,
  getChatConversations,
} from "@/lib/actions/website";
import { ChatClient } from "./chat-client";

export const metadata = { title: "Live Chat" };

export default async function ChatPage() {
  const [widgets, conversations] = await Promise.all([
    getChatWidgets(),
    getChatConversations(),
  ]);

  return <ChatClient initialWidgets={widgets} initialConversations={conversations} />;
}
