import { getFAQItems } from "@/lib/actions/website";
import { FAQClient } from "./faq-client";

export const metadata = { title: "FAQ" };

export default async function FAQPage() {
  const items = await getFAQItems();
  return <FAQClient initialItems={items} />;
}
