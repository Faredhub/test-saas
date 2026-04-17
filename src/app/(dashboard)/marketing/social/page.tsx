import { getConfiguredSocialPlatforms } from "@/lib/actions/marketing";
import { SocialClient } from "./social-client";

export const metadata = { title: "Social Media" };

export default async function SocialPage() {
  const platforms = await getConfiguredSocialPlatforms();
  return <SocialClient configuredPlatforms={platforms} />;
}
