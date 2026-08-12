export type WebsiteTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail?: string;
  tags: string[];
  /** Approximate section count for UI badges */
  sections: number;
  html: string;
  css: string;
};

export const TEMPLATE_CATEGORIES = [
  { key: "business", label: "Business", icon: "🏢" },
  { key: "restaurant", label: "Restaurant & Food", icon: "🍽️" },
  { key: "realestate", label: "Real Estate", icon: "🏠" },
  { key: "portfolio", label: "Portfolio & Creative", icon: "🎨" },
  { key: "ecommerce", label: "eCommerce", icon: "🛍️" },
  { key: "health", label: "Health & Wellness", icon: "💪" },
  { key: "education", label: "Education", icon: "📚" },
  { key: "landing", label: "Landing Pages", icon: "🚀" },
  { key: "event", label: "Events", icon: "🎉" },
] as const;

export function baseCss(opts?: {
  font?: string;
  color?: string;
  bg?: string;
}): string {
  const font =
    opts?.font ??
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const color = opts?.color ?? "#0f172a";
  const bg = opts?.bg ?? "#ffffff";
  return `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: ${font}; color: ${color}; background: ${bg}; -webkit-font-smoothing: antialiased; line-height: 1.5; }
img { max-width: 100%; height: auto; display: block; }
a { color: inherit; }
ul { list-style: none; }
button, input, textarea, select { font: inherit; }
`;
}
