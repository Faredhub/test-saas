import { getAnnouncements } from "@/lib/actions/organization";
import { NoticesClient } from "./notices-client";

export const metadata = { title: "Notices & Announcements" };

export default async function NoticesPage() {
  const announcements = await getAnnouncements();
  return <NoticesClient initialData={announcements} />;
}
