import type { Editor } from "grapesjs";

/** SVG media helpers for block thumbnails */
const icon = (path: string) =>
  `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

const ICONS = {
  hero: icon(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 10h10M7 14h6"/>'
  ),
  features: icon(
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
  ),
  cta: icon(
    '<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M8 12h8"/>'
  ),
  stats: icon(
    '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'
  ),
  testimonial: icon(
    '<path d="M7 8h4v4H9a2 2 0 0 0-2 2v1"/><path d="M15 8h4v4h-2a2 2 0 0 0-2 2v1"/>'
  ),
  form: icon(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M7 17h4"/>'
  ),
  pricing: icon(
    '<rect x="3" y="5" width="6" height="14" rx="1"/><rect x="10" y="3" width="6" height="18" rx="1"/><rect x="17" y="7" width="4" height="12" rx="1"/>'
  ),
  footer: icon(
    '<rect x="3" y="14" width="18" height="6" rx="1"/><path d="M6 17h3M12 17h6"/>'
  ),
  faq: icon(
    '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7V14"/><circle cx="12" cy="17" r=".5" fill="currentColor"/>'
  ),
  nav: icon(
    '<path d="M4 7h16M4 12h10M4 17h16"/>'
  ),
  button: icon(
    '<rect x="4" y="8" width="16" height="8" rx="4"/><path d="M9 12h6"/>'
  ),
  card: icon(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 15h4"/>'
  ),
  badge: icon(
    '<rect x="5" y="9" width="14" height="6" rx="3"/>'
  ),
  divider: icon('<path d="M3 12h18"/>'),
  spacer: icon('<path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"/>'),
  team: icon(
    '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 19c0-3 2.5-5 6-5s6 2 6 5M15 14c2.5 0 4.5 1.5 5 4"/>'
  ),
  gallery: icon(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M3 16l5-4 4 3 4-5 5 6"/>'
  ),
  logos: icon(
    '<rect x="2" y="9" width="5" height="6" rx="1"/><rect x="9.5" y="9" width="5" height="6" rx="1"/><rect x="17" y="9" width="5" height="6" rx="1"/>'
  ),
  quote: icon(
    '<path d="M7 8h4v4H9a2 2 0 0 0-2 2"/><path d="M15 8h4v4h-2a2 2 0 0 0-2 2"/>'
  ),
  alert: icon(
    '<path d="M12 3l9 16H3L12 3z"/><path d="M12 10v4M12 17h.01"/>'
  ),
  list: icon(
    '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/>'
  ),
  social: icon(
    '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.5 10.5l7-3M8.5 13.5l7 3"/>'
  ),
  container: icon(
    '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 5v14M17 5v14"/>'
  ),
  columns: icon(
    '<rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/>'
  ),
  text: icon(
    '<path d="M4 6h16M8 6v12M12 18h-4"/>'
  ),
  image: icon(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M3 16l5-4 4 3 4-5 5 6"/>'
  ),
  video: icon(
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l6 3-6 3V9z" fill="currentColor" stroke="none"/>'
  ),
  map: icon(
    '<path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'
  ),
  progress: icon(
    '<rect x="3" y="10" width="18" height="4" rx="2"/><rect x="3" y="10" width="11" height="4" rx="2" fill="currentColor" opacity=".4"/>'
  ),
  blog: icon(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h7M7 16h5"/>'
  ),
  contact: icon(
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 8l9 6 9-6"/>'
  ),
  iconbox: icon(
    '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 12l2 2 4-4"/>'
  ),
  avatar: icon(
    '<circle cx="12" cy="9" r="3.5"/><path d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"/>'
  ),
  link: icon(
    '<path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93"/><path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.4a5 5 0 0 0 7.07 7.07L14 18.07"/>'
  ),
  heading: icon(
    '<path d="M6 5v14M18 5v14M6 12h12"/>'
  ),
};

function addBlock(
  editor: Editor,
  id: string,
  opts: {
    label: string;
    category: string;
    content: string;
    media?: string;
    attributes?: Record<string, string>;
  }
) {
  editor.BlockManager.add(id, {
    label: opts.label,
    category: opts.category,
    content: opts.content,
    media: opts.media,
    attributes: opts.attributes ?? { class: "gjs-block-design" },
  });
}

export function registerDesignBlocks(editor: Editor) {
  // ─── Layout ───────────────────────────────────────────────
  addBlock(editor, "design-container", {
    label: "Container",
    category: "Layout",
    media: ICONS.container,
    content: `<div style="max-width:1200px;margin:0 auto;padding:40px 24px;width:100%;box-sizing:border-box">
  <p style="color:#94a3b8;text-align:center;margin:0">Drop content inside this container</p>
</div>`,
  });

  addBlock(editor, "design-section", {
    label: "Section",
    category: "Layout",
    media: ICONS.container,
    content: `<section style="padding:80px 24px;background:#ffffff;width:100%;box-sizing:border-box">
  <div style="max-width:1200px;margin:0 auto">
    <p style="color:#94a3b8;text-align:center;margin:0">Section content goes here</p>
  </div>
</section>`,
  });

  addBlock(editor, "design-section-dark", {
    label: "Dark Section",
    category: "Layout",
    media: ICONS.container,
    content: `<section style="padding:80px 24px;background:#0f172a;color:#f8fafc;width:100%;box-sizing:border-box">
  <div style="max-width:1200px;margin:0 auto">
    <p style="color:#94a3b8;text-align:center;margin:0">Dark section content</p>
  </div>
</section>`,
  });

  addBlock(editor, "design-section-muted", {
    label: "Muted Section",
    category: "Layout",
    media: ICONS.container,
    content: `<section style="padding:80px 24px;background:#f8fafc;width:100%;box-sizing:border-box">
  <div style="max-width:1200px;margin:0 auto">
    <p style="color:#94a3b8;text-align:center;margin:0">Muted section content</p>
  </div>
</section>`,
  });

  addBlock(editor, "design-spacer-sm", {
    label: "Spacer S",
    category: "Layout",
    media: ICONS.spacer,
    content: `<div style="height:24px;width:100%"></div>`,
  });

  addBlock(editor, "design-spacer-md", {
    label: "Spacer M",
    category: "Layout",
    media: ICONS.spacer,
    content: `<div style="height:48px;width:100%"></div>`,
  });

  addBlock(editor, "design-spacer-lg", {
    label: "Spacer L",
    category: "Layout",
    media: ICONS.spacer,
    content: `<div style="height:80px;width:100%"></div>`,
  });

  addBlock(editor, "design-divider", {
    label: "Divider",
    category: "Layout",
    media: ICONS.divider,
    content: `<div style="padding:24px 0;width:100%;box-sizing:border-box">
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:0" />
</div>`,
  });

  addBlock(editor, "design-divider-text", {
    label: "Divider + Text",
    category: "Layout",
    media: ICONS.divider,
    content: `<div style="display:flex;align-items:center;gap:16px;padding:24px 0;width:100%;box-sizing:border-box">
  <div style="flex:1;height:1px;background:#e2e8f0"></div>
  <span style="color:#94a3b8;font-size:0.875rem;font-weight:500;white-space:nowrap">OR</span>
  <div style="flex:1;height:1px;background:#e2e8f0"></div>
</div>`,
  });

  addBlock(editor, "design-grid-2", {
    label: "2 Columns",
    category: "Layout",
    media: ICONS.columns,
    content: `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px;padding:16px;width:100%;box-sizing:border-box">
  <div style="min-height:80px;background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;color:#94a3b8">Column 1</div>
  <div style="min-height:80px;background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;color:#94a3b8">Column 2</div>
</div>`,
  });

  addBlock(editor, "design-grid-3", {
    label: "3 Columns",
    category: "Layout",
    media: ICONS.columns,
    content: `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:16px;width:100%;box-sizing:border-box">
  <div style="min-height:80px;background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;color:#94a3b8">Column 1</div>
  <div style="min-height:80px;background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;color:#94a3b8">Column 2</div>
  <div style="min-height:80px;background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;color:#94a3b8">Column 3</div>
</div>`,
  });

  addBlock(editor, "design-grid-4", {
    label: "4 Columns",
    category: "Layout",
    media: ICONS.columns,
    content: `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:16px;width:100%;box-sizing:border-box">
  <div style="min-height:80px;background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;color:#94a3b8">1</div>
  <div style="min-height:80px;background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;color:#94a3b8">2</div>
  <div style="min-height:80px;background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;color:#94a3b8">3</div>
  <div style="min-height:80px;background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;color:#94a3b8">4</div>
</div>`,
  });

  addBlock(editor, "design-split", {
    label: "Split Layout",
    category: "Layout",
    media: ICONS.columns,
    content: `<div style="display:grid;grid-template-columns:1fr 1fr;min-height:400px;width:100%;box-sizing:border-box">
  <div style="padding:64px 48px;display:flex;flex-direction:column;justify-content:center;background:#ffffff">
    <h2 style="font-size:2rem;font-weight:700;margin:0 0 1rem;color:#0f172a">Headline goes here</h2>
    <p style="color:#64748b;line-height:1.7;margin:0 0 1.5rem">Describe your product or service with a short, compelling paragraph.</p>
    <a href="#" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;width:fit-content">Learn more</a>
  </div>
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);min-height:300px"></div>
</div>`,
  });

  // ─── Design Elements ──────────────────────────────────────
  addBlock(editor, "design-btn-primary", {
    label: "Primary Button",
    category: "Design",
    media: ICONS.button,
    content: `<a href="#" style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:600;font-size:1rem;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(79,70,229,0.35);border:none;cursor:pointer">Get Started</a>`,
  });

  addBlock(editor, "design-btn-secondary", {
    label: "Secondary Button",
    category: "Design",
    media: ICONS.button,
    content: `<a href="#" style="display:inline-block;padding:14px 28px;background:#0f172a;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:600;font-size:1rem;border:none;cursor:pointer">Learn More</a>`,
  });

  addBlock(editor, "design-btn-outline", {
    label: "Outline Button",
    category: "Design",
    media: ICONS.button,
    content: `<a href="#" style="display:inline-block;padding:12px 26px;background:transparent;color:#4f46e5;border:2px solid #4f46e5;border-radius:10px;text-decoration:none;font-weight:600;font-size:1rem;cursor:pointer">View Details</a>`,
  });

  addBlock(editor, "design-btn-ghost", {
    label: "Ghost Button",
    category: "Design",
    media: ICONS.button,
    content: `<a href="#" style="display:inline-block;padding:12px 20px;background:transparent;color:#475569;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;cursor:pointer">Continue →</a>`,
  });

  addBlock(editor, "design-btn-group", {
    label: "Button Group",
    category: "Design",
    media: ICONS.button,
    content: `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
  <a href="#" style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;box-shadow:0 4px 14px rgba(79,70,229,0.3)">Primary Action</a>
  <a href="#" style="display:inline-block;padding:12px 26px;background:transparent;color:#4f46e5;border:2px solid #c7d2fe;border-radius:10px;text-decoration:none;font-weight:600">Secondary</a>
</div>`,
  });

  addBlock(editor, "design-badge", {
    label: "Badge / Pill",
    category: "Design",
    media: ICONS.badge,
    content: `<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#eef2ff;color:#4f46e5;border-radius:999px;font-size:0.8rem;font-weight:600;letter-spacing:0.02em">
  <span style="width:6px;height:6px;background:#4f46e5;border-radius:50%;display:inline-block"></span>
  New feature
</span>`,
  });

  addBlock(editor, "design-badge-row", {
    label: "Badge Row",
    category: "Design",
    media: ICONS.badge,
    content: `<div style="display:flex;flex-wrap:wrap;gap:8px">
  <span style="padding:6px 12px;background:#eef2ff;color:#4f46e5;border-radius:999px;font-size:0.8rem;font-weight:600">Design</span>
  <span style="padding:6px 12px;background:#ecfdf5;color:#059669;border-radius:999px;font-size:0.8rem;font-weight:600">Product</span>
  <span style="padding:6px 12px;background:#fff7ed;color:#ea580c;border-radius:999px;font-size:0.8rem;font-weight:600">Marketing</span>
  <span style="padding:6px 12px;background:#fef2f2;color:#dc2626;border-radius:999px;font-size:0.8rem;font-weight:600">Hot</span>
</div>`,
  });

  addBlock(editor, "design-card", {
    label: "Card",
    category: "Design",
    media: ICONS.card,
    content: `<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;box-shadow:0 1px 3px rgba(15,23,42,0.06);max-width:360px">
  <h3 style="font-size:1.15rem;font-weight:700;margin:0 0 0.5rem;color:#0f172a">Card title</h3>
  <p style="color:#64748b;line-height:1.6;margin:0 0 1.25rem;font-size:0.95rem">A short description that explains the value of this card content.</p>
  <a href="#" style="color:#4f46e5;font-weight:600;text-decoration:none;font-size:0.9rem">Learn more →</a>
</div>`,
  });

  addBlock(editor, "design-card-image", {
    label: "Image Card",
    category: "Design",
    media: ICONS.card,
    content: `<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.06);max-width:360px">
  <div style="height:180px;background:linear-gradient(135deg,#818cf8,#c084fc)"></div>
  <div style="padding:24px">
    <div style="font-size:0.75rem;font-weight:600;color:#4f46e5;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Category</div>
    <h3 style="font-size:1.15rem;font-weight:700;margin:0 0 0.5rem;color:#0f172a">Featured story</h3>
    <p style="color:#64748b;line-height:1.6;margin:0;font-size:0.95rem">A compelling preview of the content behind this card.</p>
  </div>
</div>`,
  });

  addBlock(editor, "design-icon-box", {
    label: "Icon Box",
    category: "Design",
    media: ICONS.iconbox,
    content: `<div style="padding:28px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;max-width:320px">
  <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:#fff;font-size:1.25rem">★</div>
  <h3 style="font-size:1.1rem;font-weight:700;margin:0 0 0.5rem;color:#0f172a">Feature title</h3>
  <p style="color:#64748b;line-height:1.6;margin:0;font-size:0.95rem">Explain the benefit in one or two short sentences.</p>
</div>`,
  });

  addBlock(editor, "design-alert", {
    label: "Alert / Notice",
    category: "Design",
    media: ICONS.alert,
    content: `<div style="display:flex;gap:14px;align-items:flex-start;padding:16px 18px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;color:#312e81">
  <div style="font-size:1.25rem;line-height:1">💡</div>
  <div>
    <div style="font-weight:700;margin-bottom:4px">Pro tip</div>
    <div style="font-size:0.9rem;opacity:0.9;line-height:1.5">Use this notice to highlight important information, announcements, or tips.</div>
  </div>
</div>`,
  });

  addBlock(editor, "design-progress", {
    label: "Progress Bar",
    category: "Design",
    media: ICONS.progress,
    content: `<div style="max-width:400px">
  <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.875rem">
    <span style="font-weight:600;color:#0f172a">Project progress</span>
    <span style="color:#64748b">72%</span>
  </div>
  <div style="height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden">
    <div style="height:100%;width:72%;background:linear-gradient(90deg,#4f46e5,#7c3aed);border-radius:999px"></div>
  </div>
</div>`,
  });

  addBlock(editor, "design-avatar", {
    label: "Avatar",
    category: "Design",
    media: ICONS.avatar,
    content: `<div style="display:flex;align-items:center;gap:12px">
  <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1rem">JD</div>
  <div>
    <div style="font-weight:600;color:#0f172a">Jane Doe</div>
    <div style="font-size:0.875rem;color:#64748b">Product Designer</div>
  </div>
</div>`,
  });

  addBlock(editor, "design-avatar-stack", {
    label: "Avatar Stack",
    category: "Design",
    media: ICONS.avatar,
    content: `<div style="display:flex;align-items:center">
  <div style="display:flex">
    <div style="width:36px;height:36px;border-radius:50%;background:#6366f1;border:2px solid #fff;margin-left:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.7rem;font-weight:700">A</div>
    <div style="width:36px;height:36px;border-radius:50%;background:#8b5cf6;border:2px solid #fff;margin-left:-10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.7rem;font-weight:700">B</div>
    <div style="width:36px;height:36px;border-radius:50%;background:#a855f7;border:2px solid #fff;margin-left:-10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.7rem;font-weight:700">C</div>
    <div style="width:36px;height:36px;border-radius:50%;background:#c084fc;border:2px solid #fff;margin-left:-10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.7rem;font-weight:700">+</div>
  </div>
  <span style="margin-left:12px;font-size:0.875rem;color:#64748b;font-weight:500">2,400+ happy customers</span>
</div>`,
  });

  addBlock(editor, "design-checklist", {
    label: "Checklist",
    category: "Design",
    media: ICONS.list,
    content: `<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px">
  <li style="display:flex;align-items:flex-start;gap:10px;color:#334155"><span style="color:#22c55e;font-weight:700">✓</span><span>Unlimited projects and workspaces</span></li>
  <li style="display:flex;align-items:flex-start;gap:10px;color:#334155"><span style="color:#22c55e;font-weight:700">✓</span><span>Priority email and chat support</span></li>
  <li style="display:flex;align-items:flex-start;gap:10px;color:#334155"><span style="color:#22c55e;font-weight:700">✓</span><span>Advanced analytics dashboard</span></li>
  <li style="display:flex;align-items:flex-start;gap:10px;color:#334155"><span style="color:#22c55e;font-weight:700">✓</span><span>SSO and team permissions</span></li>
</ul>`,
  });

  addBlock(editor, "design-social", {
    label: "Social Links",
    category: "Design",
    media: ICONS.social,
    content: `<div style="display:flex;gap:12px;align-items:center">
  <a href="#" style="width:40px;height:40px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;text-decoration:none;color:#475569;font-weight:700;font-size:0.85rem">Tw</a>
  <a href="#" style="width:40px;height:40px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;text-decoration:none;color:#475569;font-weight:700;font-size:0.85rem">In</a>
  <a href="#" style="width:40px;height:40px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;text-decoration:none;color:#475569;font-weight:700;font-size:0.85rem">Fb</a>
  <a href="#" style="width:40px;height:40px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;text-decoration:none;color:#475569;font-weight:700;font-size:0.85rem">Yt</a>
</div>`,
  });

  // ─── Typography ───────────────────────────────────────────
  addBlock(editor, "design-heading-hero", {
    label: "Hero Heading",
    category: "Typography",
    media: ICONS.heading,
    content: `<h1 style="font-size:3.25rem;font-weight:800;line-height:1.1;letter-spacing:-0.03em;color:#0f172a;margin:0">Build something people love</h1>`,
  });

  addBlock(editor, "design-heading-section", {
    label: "Section Heading",
    category: "Typography",
    media: ICONS.heading,
    content: `<div style="text-align:center;max-width:640px;margin:0 auto">
  <div style="display:inline-block;padding:6px 12px;background:#eef2ff;color:#4f46e5;border-radius:999px;font-size:0.8rem;font-weight:600;margin-bottom:16px">Why us</div>
  <h2 style="font-size:2.25rem;font-weight:800;letter-spacing:-0.02em;color:#0f172a;margin:0 0 1rem">Everything you need to grow</h2>
  <p style="font-size:1.125rem;color:#64748b;line-height:1.7;margin:0">A short supporting line that explains the section value proposition.</p>
</div>`,
  });

  addBlock(editor, "design-lead", {
    label: "Lead Paragraph",
    category: "Typography",
    media: ICONS.text,
    content: `<p style="font-size:1.25rem;line-height:1.75;color:#475569;margin:0;max-width:680px">This lead paragraph sets the tone. Keep it to two or three lines so readers grasp the message instantly.</p>`,
  });

  addBlock(editor, "design-quote", {
    label: "Blockquote",
    category: "Typography",
    media: ICONS.quote,
    content: `<blockquote style="margin:0;padding:24px 28px;border-left:4px solid #4f46e5;background:#f8fafc;border-radius:0 12px 12px 0">
  <p style="font-size:1.2rem;line-height:1.7;color:#1e293b;font-style:italic;margin:0 0 1rem">"This product transformed how our team ships. The design system alone saved us weeks."</p>
  <footer style="font-size:0.9rem;color:#64748b;font-style:normal"><strong style="color:#0f172a">Alex Rivera</strong> — Head of Design, Northwind</footer>
</blockquote>`,
  });

  addBlock(editor, "design-text-link", {
    label: "Text Link",
    category: "Typography",
    media: ICONS.link,
    content: `<a href="#" style="color:#4f46e5;font-weight:600;text-decoration:none;border-bottom:1px solid #c7d2fe">Explore documentation →</a>`,
  });

  // ─── Sections ─────────────────────────────────────────────
  addBlock(editor, "hero-section", {
    label: "Hero Centered",
    category: "Sections",
    media: ICONS.hero,
    content: `<section style="padding:100px 24px;text-align:center;background:radial-gradient(ellipse at top,#eef2ff 0%,#ffffff 55%);color:#0f172a;box-sizing:border-box">
  <div style="max-width:820px;margin:0 auto">
    <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#eef2ff;color:#4f46e5;border-radius:999px;font-size:0.8rem;font-weight:600;margin-bottom:24px">✨ Now with AI design assist</span>
    <h1 style="font-size:3.5rem;margin:0 0 1.25rem;font-weight:800;letter-spacing:-0.03em;line-height:1.1">Design beautiful websites without writing code</h1>
    <p style="font-size:1.25rem;margin:0 0 2rem;color:#64748b;line-height:1.7">Drag polished sections, fine-tune styles, and publish in minutes. Built for teams who care about craft.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="#" style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;box-shadow:0 8px 24px rgba(79,70,229,0.35)">Start free trial</a>
      <a href="#" style="display:inline-block;padding:12px 26px;background:#fff;color:#334155;border:1px solid #e2e8f0;border-radius:10px;text-decoration:none;font-weight:600">Watch demo</a>
    </div>
  </div>
</section>`,
  });

  addBlock(editor, "hero-split", {
    label: "Hero Split",
    category: "Sections",
    media: ICONS.hero,
    content: `<section style="padding:80px 24px;background:#0f172a;color:#f8fafc;box-sizing:border-box">
  <div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1.1fr 0.9fr;gap:48px;align-items:center">
    <div>
      <span style="display:inline-block;padding:6px 12px;background:rgba(99,102,241,0.2);color:#a5b4fc;border-radius:999px;font-size:0.8rem;font-weight:600;margin-bottom:20px">Trusted by 10k+ teams</span>
      <h1 style="font-size:3rem;font-weight:800;line-height:1.15;letter-spacing:-0.03em;margin:0 0 1.25rem">Ship websites that look designed, not default</h1>
      <p style="font-size:1.15rem;color:#94a3b8;line-height:1.7;margin:0 0 2rem">A modern builder with real design elements — buttons, cards, sections, and style controls that feel professional.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a href="#" style="display:inline-block;padding:14px 28px;background:#6366f1;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Get started</a>
        <a href="#" style="display:inline-block;padding:12px 26px;border:1px solid #334155;color:#e2e8f0;border-radius:10px;text-decoration:none;font-weight:600">Book a demo</a>
      </div>
    </div>
    <div style="min-height:340px;border-radius:20px;background:linear-gradient(145deg,#312e81 0%,#4f46e5 45%,#7c3aed 100%);box-shadow:0 25px 50px rgba(0,0,0,0.35)"></div>
  </div>
</section>`,
  });

  addBlock(editor, "features-grid", {
    label: "Features Grid",
    category: "Sections",
    media: ICONS.features,
    content: `<section style="padding:96px 24px;background:#ffffff;box-sizing:border-box">
  <div style="max-width:1200px;margin:0 auto">
    <div style="text-align:center;max-width:560px;margin:0 auto 56px">
      <div style="display:inline-block;padding:6px 12px;background:#eef2ff;color:#4f46e5;border-radius:999px;font-size:0.8rem;font-weight:600;margin-bottom:14px">Features</div>
      <h2 style="font-size:2.25rem;font-weight:800;letter-spacing:-0.02em;color:#0f172a;margin:0 0 0.75rem">Everything in one place</h2>
      <p style="color:#64748b;font-size:1.05rem;line-height:1.7;margin:0">Powerful building blocks designed for modern marketing sites.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
      <div style="padding:28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px">
        <div style="width:44px;height:44px;border-radius:12px;background:#eef2ff;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:1.25rem">⚡</div>
        <h3 style="margin:0 0 0.5rem;font-weight:700;color:#0f172a">Lightning fast</h3>
        <p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Optimized structure so pages load quickly on every device.</p>
      </div>
      <div style="padding:28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px">
        <div style="width:44px;height:44px;border-radius:12px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:1.25rem">🎨</div>
        <h3 style="margin:0 0 0.5rem;font-weight:700;color:#0f172a">Design-first</h3>
        <p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Curated design elements that look intentional out of the box.</p>
      </div>
      <div style="padding:28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px">
        <div style="width:44px;height:44px;border-radius:12px;background:#fff7ed;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:1.25rem">📱</div>
        <h3 style="margin:0 0 0.5rem;font-weight:700;color:#0f172a">Responsive</h3>
        <p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Preview desktop, tablet, and mobile while you design.</p>
      </div>
    </div>
  </div>
</section>`,
  });

  addBlock(editor, "cta-section", {
    label: "Call to Action",
    category: "Sections",
    media: ICONS.cta,
    content: `<section style="padding:80px 24px;box-sizing:border-box">
  <div style="max-width:1100px;margin:0 auto;padding:56px 40px;text-align:center;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#fff;border-radius:24px;box-shadow:0 20px 40px rgba(79,70,229,0.25)">
    <h2 style="font-size:2.25rem;margin:0 0 0.75rem;font-weight:800;letter-spacing:-0.02em">Ready to build something great?</h2>
    <p style="font-size:1.1rem;margin:0 0 1.75rem;opacity:0.9;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.6">Join thousands of teams designing faster with a real design system in their website builder.</p>
    <a href="#" style="display:inline-block;padding:14px 32px;background:#fff;color:#4f46e5;border-radius:10px;text-decoration:none;font-weight:700">Start free trial</a>
  </div>
</section>`,
  });

  addBlock(editor, "stats-section", {
    label: "Stats Bar",
    category: "Sections",
    media: ICONS.stats,
    content: `<section style="padding:64px 24px;background:#0f172a;color:#f8fafc;box-sizing:border-box">
  <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:32px;text-align:center">
    <div><div style="font-size:2.5rem;font-weight:800;background:linear-gradient(90deg,#a5b4fc,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">10K+</div><div style="color:#94a3b8;margin-top:0.35rem;font-size:0.95rem">Customers</div></div>
    <div><div style="font-size:2.5rem;font-weight:800;background:linear-gradient(90deg,#a5b4fc,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">50+</div><div style="color:#94a3b8;margin-top:0.35rem;font-size:0.95rem">Integrations</div></div>
    <div><div style="font-size:2.5rem;font-weight:800;background:linear-gradient(90deg,#a5b4fc,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">99.9%</div><div style="color:#94a3b8;margin-top:0.35rem;font-size:0.95rem">Uptime</div></div>
    <div><div style="font-size:2.5rem;font-weight:800;background:linear-gradient(90deg,#a5b4fc,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">24/7</div><div style="color:#94a3b8;margin-top:0.35rem;font-size:0.95rem">Support</div></div>
  </div>
</section>`,
  });

  addBlock(editor, "testimonial", {
    label: "Testimonial",
    category: "Sections",
    media: ICONS.testimonial,
    content: `<section style="padding:96px 24px;background:#f8fafc;box-sizing:border-box">
  <div style="max-width:720px;margin:0 auto;text-align:center">
    <div style="font-size:2rem;margin-bottom:20px;letter-spacing:2px;color:#f59e0b">★★★★★</div>
    <p style="font-size:1.35rem;line-height:1.75;color:#1e293b;font-style:italic;margin:0 0 2rem">"This is the first website builder that actually feels like a design tool. Sections look intentional, and the style panel makes fine-tuning effortless."</p>
    <div style="display:flex;align-items:center;justify-content:center;gap:12px">
      <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">JD</div>
      <div style="text-align:left">
        <div style="font-weight:700;color:#0f172a">Jordan Lee</div>
        <div style="color:#64748b;font-size:0.9rem">CEO, Studio North</div>
      </div>
    </div>
  </div>
</section>`,
  });

  addBlock(editor, "testimonials-grid", {
    label: "Testimonials Grid",
    category: "Sections",
    media: ICONS.testimonial,
    content: `<section style="padding:96px 24px;background:#ffffff;box-sizing:border-box">
  <div style="max-width:1100px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:800;color:#0f172a;margin:0 0 48px">Loved by teams everywhere</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
      <div style="padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc">
        <div style="color:#f59e0b;margin-bottom:12px">★★★★★</div>
        <p style="color:#334155;line-height:1.65;margin:0 0 16px;font-size:0.95rem">"Finally a builder with real design polish. Our landing page conversion jumped in a week."</p>
        <div style="font-weight:600;color:#0f172a;font-size:0.9rem">Sam Chen</div>
        <div style="color:#94a3b8;font-size:0.8rem">Growth Lead</div>
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc">
        <div style="color:#f59e0b;margin-bottom:12px">★★★★★</div>
        <p style="color:#334155;line-height:1.65;margin:0 0 16px;font-size:0.95rem">"Style controls are excellent. I can match brand guidelines without custom CSS."</p>
        <div style="font-weight:600;color:#0f172a;font-size:0.9rem">Priya Nair</div>
        <div style="color:#94a3b8;font-size:0.8rem">Brand Designer</div>
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc">
        <div style="color:#f59e0b;margin-bottom:12px">★★★★★</div>
        <p style="color:#334155;line-height:1.65;margin:0 0 16px;font-size:0.95rem">"Sections are production-ready. We ship campaign pages the same day."</p>
        <div style="font-weight:600;color:#0f172a;font-size:0.9rem">Marcus Webb</div>
        <div style="color:#94a3b8;font-size:0.8rem">Marketing Ops</div>
      </div>
    </div>
  </div>
</section>`,
  });

  addBlock(editor, "pricing-table", {
    label: "Pricing Table",
    category: "Sections",
    media: ICONS.pricing,
    content: `<section style="padding:96px 24px;background:#ffffff;box-sizing:border-box">
  <div style="max-width:1100px;margin:0 auto">
    <div style="text-align:center;margin-bottom:48px">
      <h2 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin:0 0 0.75rem">Simple, transparent pricing</h2>
      <p style="color:#64748b;margin:0">Start free. Upgrade when you're ready.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;align-items:stretch">
      <div style="padding:32px 28px;border:1px solid #e2e8f0;border-radius:20px;background:#fff">
        <h3 style="font-size:1.1rem;margin:0 0 0.5rem;color:#0f172a">Starter</h3>
        <div style="font-size:2.75rem;font-weight:800;color:#0f172a;letter-spacing:-0.03em">$9<span style="font-size:1rem;color:#64748b;font-weight:500">/mo</span></div>
        <ul style="list-style:none;padding:0;margin:1.5rem 0;color:#64748b;line-height:2.1;font-size:0.95rem"><li>✓ 5 projects</li><li>✓ 10GB storage</li><li>✓ Basic support</li></ul>
        <a href="#" style="display:block;padding:12px;text-align:center;background:#f1f5f9;color:#0f172a;border-radius:10px;text-decoration:none;font-weight:600">Get started</a>
      </div>
      <div style="padding:32px 28px;border:2px solid #4f46e5;border-radius:20px;background:#fff;box-shadow:0 12px 40px rgba(79,70,229,0.15);position:relative">
        <span style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#4f46e5;color:#fff;padding:4px 14px;border-radius:999px;font-size:0.75rem;font-weight:700">Most popular</span>
        <h3 style="font-size:1.1rem;margin:0.25rem 0 0.5rem;color:#0f172a">Professional</h3>
        <div style="font-size:2.75rem;font-weight:800;color:#0f172a;letter-spacing:-0.03em">$29<span style="font-size:1rem;color:#64748b;font-weight:500">/mo</span></div>
        <ul style="list-style:none;padding:0;margin:1.5rem 0;color:#64748b;line-height:2.1;font-size:0.95rem"><li>✓ Unlimited projects</li><li>✓ 100GB storage</li><li>✓ Priority support</li><li>✓ API access</li></ul>
        <a href="#" style="display:block;padding:12px;text-align:center;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Get started</a>
      </div>
      <div style="padding:32px 28px;border:1px solid #e2e8f0;border-radius:20px;background:#fff">
        <h3 style="font-size:1.1rem;margin:0 0 0.5rem;color:#0f172a">Enterprise</h3>
        <div style="font-size:2.75rem;font-weight:800;color:#0f172a;letter-spacing:-0.03em">$99<span style="font-size:1rem;color:#64748b;font-weight:500">/mo</span></div>
        <ul style="list-style:none;padding:0;margin:1.5rem 0;color:#64748b;line-height:2.1;font-size:0.95rem"><li>✓ Everything in Pro</li><li>✓ Unlimited storage</li><li>✓ Dedicated support</li><li>✓ SLA + SSO</li></ul>
        <a href="#" style="display:block;padding:12px;text-align:center;background:#f1f5f9;color:#0f172a;border-radius:10px;text-decoration:none;font-weight:600">Contact sales</a>
      </div>
    </div>
  </div>
</section>`,
  });

  addBlock(editor, "team-section", {
    label: "Team Grid",
    category: "Sections",
    media: ICONS.team,
    content: `<section style="padding:96px 24px;background:#f8fafc;box-sizing:border-box">
  <div style="max-width:1100px;margin:0 auto">
    <div style="text-align:center;margin-bottom:48px">
      <h2 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin:0 0 0.75rem">Meet the team</h2>
      <p style="color:#64748b;margin:0">The people building the product you love.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px">
      <div style="text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 16px">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);margin:0 auto 16px"></div>
        <div style="font-weight:700;color:#0f172a">Alex Morgan</div>
        <div style="color:#64748b;font-size:0.875rem;margin-top:4px">CEO & Founder</div>
      </div>
      <div style="text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 16px">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#06b6d4,#3b82f6);margin:0 auto 16px"></div>
        <div style="font-weight:700;color:#0f172a">Sam Rivera</div>
        <div style="color:#64748b;font-size:0.875rem;margin-top:4px">Head of Design</div>
      </div>
      <div style="text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 16px">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#ef4444);margin:0 auto 16px"></div>
        <div style="font-weight:700;color:#0f172a">Jamie Park</div>
        <div style="color:#64748b;font-size:0.875rem;margin-top:4px">Engineering</div>
      </div>
      <div style="text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 16px">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#10b981,#14b8a6);margin:0 auto 16px"></div>
        <div style="font-weight:700;color:#0f172a">Riley Quinn</div>
        <div style="color:#64748b;font-size:0.875rem;margin-top:4px">Marketing</div>
      </div>
    </div>
  </div>
</section>`,
  });

  addBlock(editor, "logo-cloud", {
    label: "Logo Cloud",
    category: "Sections",
    media: ICONS.logos,
    content: `<section style="padding:56px 24px;background:#ffffff;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;box-sizing:border-box">
  <div style="max-width:1000px;margin:0 auto;text-align:center">
    <p style="color:#94a3b8;font-size:0.85rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 28px">Trusted by leading companies</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:40px;opacity:0.7">
      <div style="font-size:1.25rem;font-weight:800;color:#64748b;letter-spacing:-0.02em">ACME</div>
      <div style="font-size:1.25rem;font-weight:800;color:#64748b;letter-spacing:-0.02em">Globex</div>
      <div style="font-size:1.25rem;font-weight:800;color:#64748b;letter-spacing:-0.02em">Initech</div>
      <div style="font-size:1.25rem;font-weight:800;color:#64748b;letter-spacing:-0.02em">Umbrella</div>
      <div style="font-size:1.25rem;font-weight:800;color:#64748b;letter-spacing:-0.02em">Stark</div>
    </div>
  </div>
</section>`,
  });

  addBlock(editor, "gallery-section", {
    label: "Image Gallery",
    category: "Sections",
    media: ICONS.gallery,
    content: `<section style="padding:96px 24px;background:#ffffff;box-sizing:border-box">
  <div style="max-width:1200px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:800;color:#0f172a;margin:0 0 40px">Gallery</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
      <div style="aspect-ratio:4/3;border-radius:14px;background:linear-gradient(135deg,#c7d2fe,#a5b4fc)"></div>
      <div style="aspect-ratio:4/3;border-radius:14px;background:linear-gradient(135deg,#ddd6fe,#c4b5fd)"></div>
      <div style="aspect-ratio:4/3;border-radius:14px;background:linear-gradient(135deg,#fbcfe8,#f9a8d4)"></div>
      <div style="aspect-ratio:4/3;border-radius:14px;background:linear-gradient(135deg,#a5f3fc,#67e8f9)"></div>
      <div style="aspect-ratio:4/3;border-radius:14px;background:linear-gradient(135deg,#bbf7d0,#86efac)"></div>
      <div style="aspect-ratio:4/3;border-radius:14px;background:linear-gradient(135deg,#fde68a,#fcd34d)"></div>
    </div>
  </div>
</section>`,
  });

  addBlock(editor, "blog-cards", {
    label: "Blog Cards",
    category: "Sections",
    media: ICONS.blog,
    content: `<section style="padding:96px 24px;background:#f8fafc;box-sizing:border-box">
  <div style="max-width:1100px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:end;margin-bottom:36px;gap:16px;flex-wrap:wrap">
      <div>
        <h2 style="font-size:2rem;font-weight:800;color:#0f172a;margin:0 0 0.5rem">From the blog</h2>
        <p style="color:#64748b;margin:0">Insights, tutorials, and product updates.</p>
      </div>
      <a href="#" style="color:#4f46e5;font-weight:600;text-decoration:none">View all →</a>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
      <article style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
        <div style="height:160px;background:linear-gradient(135deg,#818cf8,#6366f1)"></div>
        <div style="padding:20px">
          <div style="font-size:0.75rem;font-weight:600;color:#4f46e5;margin-bottom:8px">PRODUCT</div>
          <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 8px">How we redesigned onboarding</h3>
          <p style="color:#64748b;font-size:0.9rem;line-height:1.55;margin:0">A look at the process behind our new first-run experience.</p>
        </div>
      </article>
      <article style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
        <div style="height:160px;background:linear-gradient(135deg,#34d399,#10b981)"></div>
        <div style="padding:20px">
          <div style="font-size:0.75rem;font-weight:600;color:#059669;margin-bottom:8px">GROWTH</div>
          <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 8px">5 landing page patterns that convert</h3>
          <p style="color:#64748b;font-size:0.9rem;line-height:1.55;margin:0">Proven layouts our top customers use for campaigns.</p>
        </div>
      </article>
      <article style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
        <div style="height:160px;background:linear-gradient(135deg,#fb7185,#f43f5e)"></div>
        <div style="padding:20px">
          <div style="font-size:0.75rem;font-weight:600;color:#e11d48;margin-bottom:8px">DESIGN</div>
          <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 8px">Building a cohesive design system</h3>
          <p style="color:#64748b;font-size:0.9rem;line-height:1.55;margin:0">Tokens, components, and the rules that keep brands consistent.</p>
        </div>
      </article>
    </div>
  </div>
</section>`,
  });

  addBlock(editor, "faq-section", {
    label: "FAQ Section",
    category: "Sections",
    media: ICONS.faq,
    content: `<section style="padding:96px 24px;background:#ffffff;box-sizing:border-box">
  <div style="max-width:760px;margin:0 auto">
    <h2 style="text-align:center;font-size:2.25rem;font-weight:800;color:#0f172a;margin:0 0 40px">Frequently asked questions</h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="background:#f8fafc;padding:20px 22px;border-radius:14px;border:1px solid #e2e8f0">
        <h4 style="margin:0 0 0.5rem;font-weight:700;color:#0f172a">How does the free trial work?</h4>
        <p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Try every feature free for 14 days. No credit card required to start.</p>
      </div>
      <div style="background:#f8fafc;padding:20px 22px;border-radius:14px;border:1px solid #e2e8f0">
        <h4 style="margin:0 0 0.5rem;font-weight:700;color:#0f172a">Can I change my plan later?</h4>
        <p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Yes — upgrade or downgrade any time. Changes apply on your next billing cycle.</p>
      </div>
      <div style="background:#f8fafc;padding:20px 22px;border-radius:14px;border:1px solid #e2e8f0">
        <h4 style="margin:0 0 0.5rem;font-weight:700;color:#0f172a">Do you offer custom designs?</h4>
        <p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Enterprise plans include design reviews and custom block packs for your brand.</p>
      </div>
    </div>
  </div>
</section>`,
  });

  addBlock(editor, "navbar-block", {
    label: "Navbar",
    category: "Sections",
    media: ICONS.nav,
    content: `<nav style="padding:14px 24px;background:rgba(255,255,255,0.9);border-bottom:1px solid #e2e8f0;backdrop-filter:blur(8px);box-sizing:border-box">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:1.35rem;font-weight:800;color:#0f172a;letter-spacing:-0.02em">Brand</div>
    <div style="display:flex;gap:28px;align-items:center">
      <a href="#" style="color:#64748b;text-decoration:none;font-weight:500;font-size:0.95rem">Product</a>
      <a href="#" style="color:#64748b;text-decoration:none;font-weight:500;font-size:0.95rem">Features</a>
      <a href="#" style="color:#64748b;text-decoration:none;font-weight:500;font-size:0.95rem">Pricing</a>
      <a href="#" style="color:#64748b;text-decoration:none;font-weight:500;font-size:0.95rem">Contact</a>
      <a href="#" style="display:inline-block;padding:9px 18px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9rem">Sign up</a>
    </div>
  </div>
</nav>`,
  });

  addBlock(editor, "footer-section", {
    label: "Footer",
    category: "Sections",
    media: ICONS.footer,
    content: `<footer style="background:#0f172a;color:#f8fafc;padding:64px 24px 32px;box-sizing:border-box">
  <div style="max-width:1200px;margin:0 auto">
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px">
      <div>
        <h4 style="font-size:1.25rem;margin:0 0 1rem;font-weight:800;letter-spacing:-0.02em">Brand</h4>
        <p style="color:#94a3b8;line-height:1.7;margin:0;max-width:280px">Building beautiful web experiences with tools that respect design craft.</p>
      </div>
      <div>
        <h4 style="font-size:0.8rem;margin:0 0 1rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#cbd5e1">Product</h4>
        <ul style="list-style:none;padding:0;margin:0;color:#94a3b8;line-height:2.1"><li>Features</li><li>Pricing</li><li>Integrations</li><li>Changelog</li></ul>
      </div>
      <div>
        <h4 style="font-size:0.8rem;margin:0 0 1rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#cbd5e1">Company</h4>
        <ul style="list-style:none;padding:0;margin:0;color:#94a3b8;line-height:2.1"><li>About</li><li>Blog</li><li>Careers</li><li>Contact</li></ul>
      </div>
      <div>
        <h4 style="font-size:0.8rem;margin:0 0 1rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#cbd5e1">Legal</h4>
        <ul style="list-style:none;padding:0;margin:0;color:#94a3b8;line-height:2.1"><li>Privacy</li><li>Terms</li><li>Cookies</li></ul>
      </div>
    </div>
    <div style="border-top:1px solid #1e293b;margin-top:40px;padding-top:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;color:#64748b;font-size:0.9rem">
      <span>&copy; 2026 Your Company. All rights reserved.</span>
      <div style="display:flex;gap:16px"><span>Twitter</span><span>LinkedIn</span><span>GitHub</span></div>
    </div>
  </div>
</footer>`,
  });

  // ─── Forms ────────────────────────────────────────────────
  addBlock(editor, "contact-form", {
    label: "Contact Form",
    category: "Forms",
    media: ICONS.contact,
    content: `<section style="padding:96px 24px;background:#ffffff;box-sizing:border-box">
  <div style="max-width:560px;margin:0 auto">
    <div style="text-align:center;margin-bottom:32px">
      <h2 style="font-size:2rem;font-weight:800;color:#0f172a;margin:0 0 0.5rem">Get in touch</h2>
      <p style="color:#64748b;margin:0">We typically respond within one business day.</p>
    </div>
    <form style="display:flex;flex-direction:column;gap:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <input type="text" placeholder="First name" style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:0.95rem;width:100%;box-sizing:border-box;background:#f8fafc" />
        <input type="text" placeholder="Last name" style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:0.95rem;width:100%;box-sizing:border-box;background:#f8fafc" />
      </div>
      <input type="email" placeholder="Work email" style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:0.95rem;width:100%;box-sizing:border-box;background:#f8fafc" />
      <textarea placeholder="How can we help?" rows="4" style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:0.95rem;width:100%;box-sizing:border-box;resize:vertical;background:#f8fafc;font-family:inherit"></textarea>
      <button type="submit" style="padding:14px 24px;background:#4f46e5;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(79,70,229,0.3)">Send message</button>
    </form>
  </div>
</section>`,
  });

  addBlock(editor, "newsletter-form", {
    label: "Newsletter Signup",
    category: "Forms",
    media: ICONS.form,
    content: `<section style="padding:64px 24px;background:linear-gradient(135deg,#0f172a,#1e1b4b);color:#fff;text-align:center;box-sizing:border-box">
  <div style="max-width:520px;margin:0 auto">
    <h3 style="font-size:1.75rem;margin:0 0 0.5rem;font-weight:800;letter-spacing:-0.02em">Stay in the loop</h3>
    <p style="margin:0 0 1.5rem;opacity:0.8;line-height:1.6">Product updates, design tips, and launch news — no spam.</p>
    <form style="display:flex;gap:8px;max-width:420px;margin:0 auto;flex-wrap:wrap;justify-content:center">
      <input type="email" placeholder="you@company.com" style="flex:1;min-width:200px;padding:13px 16px;border:none;border-radius:10px;font-size:0.95rem" />
      <button type="submit" style="padding:13px 22px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;white-space:nowrap">Subscribe</button>
    </form>
  </div>
</section>`,
  });

  addBlock(editor, "lead-capture", {
    label: "Lead Capture",
    category: "Forms",
    media: ICONS.form,
    content: `<section style="padding:80px 24px;box-sizing:border-box">
  <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:0;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 40px rgba(15,23,42,0.08)">
    <div style="padding:48px 40px;background:linear-gradient(145deg,#4f46e5,#7c3aed);color:#fff">
      <h2 style="font-size:1.75rem;font-weight:800;margin:0 0 1rem;letter-spacing:-0.02em">Get the free playbook</h2>
      <p style="opacity:0.9;line-height:1.7;margin:0 0 1.5rem">Download our 24-page guide on high-converting landing page design patterns.</p>
      <ul style="list-style:none;padding:0;margin:0;line-height:2;opacity:0.9;font-size:0.95rem">
        <li>✓ 12 proven layouts</li>
        <li>✓ Copy formulas that convert</li>
        <li>✓ Checklist for launch day</li>
      </ul>
    </div>
    <div style="padding:48px 40px;background:#fff">
      <form style="display:flex;flex-direction:column;gap:12px">
        <input type="text" placeholder="Full name" style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:0.95rem;width:100%;box-sizing:border-box" />
        <input type="email" placeholder="Work email" style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:0.95rem;width:100%;box-sizing:border-box" />
        <input type="text" placeholder="Company" style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:0.95rem;width:100%;box-sizing:border-box" />
        <button type="submit" style="padding:14px;background:#4f46e5;color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;margin-top:4px">Download free PDF</button>
        <p style="font-size:0.75rem;color:#94a3b8;margin:0;text-align:center">No spam. Unsubscribe anytime.</p>
      </form>
    </div>
  </div>
</section>`,
  });
}
