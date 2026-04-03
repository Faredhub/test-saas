import { getUserProfile } from "@/lib/actions/user";
import { ProfileClient } from "./profile-client";

export const metadata = { title: "Profile Settings" };

export default async function ProfilePage() {
  const profile = await getUserProfile();
  if (!profile) return <div>Unable to load profile</div>;
  return <ProfileClient profile={profile} />;
}
