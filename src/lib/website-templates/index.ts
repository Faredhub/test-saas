import { websiteTemplatesPartA } from "./pages";
import { websiteTemplatesPartB } from "./pages-rest";
import { TEMPLATE_CATEGORIES, type WebsiteTemplate } from "./types";

export type { WebsiteTemplate } from "./types";
export { TEMPLATE_CATEGORIES, baseCss } from "./types";

/** Full multi-section GrapesJS page designs, organized by niche. */
export const websiteTemplates: WebsiteTemplate[] = [
  ...websiteTemplatesPartA,
  ...websiteTemplatesPartB,
];

export function getTemplatesByCategory(category: string): WebsiteTemplate[] {
  return websiteTemplates.filter((t) => t.category === category);
}

export function getTemplateById(id: string): WebsiteTemplate | undefined {
  return websiteTemplates.find((t) => t.id === id);
}

export function getTemplateCategories() {
  return TEMPLATE_CATEGORIES;
}
