import { getThemes } from "@/lib/actions/website";
import { ThemesClient } from "./themes-client";
import type { Theme } from "./themes-client";

export const metadata = { title: "Website Themes" };

export default async function ThemesPage() {
  const themes = await getThemes();
  return <ThemesClient initialThemes={themes as Theme[]} />;
}
