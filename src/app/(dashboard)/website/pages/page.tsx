import { getPages, getPageTemplates } from "@/lib/actions/website";
import { PagesClient } from "./pages-client";

export const metadata = { title: "Pages" };

export default async function PagesPage() {
  const [pages, templates] = await Promise.all([
    getPages(),
    getPageTemplates(),
  ]);

  return <PagesClient initialPages={pages} templates={templates} />;
}
