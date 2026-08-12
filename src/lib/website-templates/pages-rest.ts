import { baseCss, type WebsiteTemplate } from "./types";

export const websiteTemplatesPartB: WebsiteTemplate[] = [
  // ═══════════════════════════════════════════════════════════
  // PORTFOLIO
  // ═══════════════════════════════════════════════════════════
  {
    id: "portfolio-creative",
    name: "Creative Portfolio",
    category: "portfolio",
    description:
      "Full creative portfolio: nav, intro, selected work, process, about, clients, contact, footer",
    tags: ["portfolio", "creative", "designer", "photographer", "artist"],
    sections: 8,
    css: baseCss({ font: "Inter, system-ui, sans-serif", color: "#111827" }),
    html: `
<nav style="padding:22px 24px">
  <div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:1.15rem;font-weight:300;letter-spacing:0.18em">JANE DOE</div>
    <div style="display:flex;gap:28px;flex-wrap:wrap">
      <a href="#work" style="color:#111827;text-decoration:none;font-weight:400;font-size:0.95rem">Work</a>
      <a href="#about" style="color:#111827;text-decoration:none;font-weight:400;font-size:0.95rem">About</a>
      <a href="#process" style="color:#111827;text-decoration:none;font-weight:400;font-size:0.95rem">Process</a>
      <a href="#contact" style="color:#111827;text-decoration:none;font-weight:400;font-size:0.95rem">Contact</a>
    </div>
  </div>
</nav>

<section style="padding:72px 24px 64px;text-align:center">
  <div style="max-width:640px;margin:0 auto">
    <p style="font-size:0.8rem;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;margin:0 0 16px">Designer & art director</p>
    <h1 style="font-size:3.25rem;font-weight:300;margin:0 0 1rem;letter-spacing:-0.03em;line-height:1.15">I design calm, clear digital experiences</h1>
    <p style="font-size:1.15rem;color:#6b7280;line-height:1.7;margin:0">Based in Copenhagen · Available for select collaborations in 2026</p>
  </div>
</section>

<section id="work" style="padding:0 24px 80px">
  <div style="max-width:1100px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:24px">
      <h2 style="font-size:1.1rem;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;margin:0">Selected work</h2>
      <span style="font-size:0.85rem;color:#9ca3af">2019 — 2026</span>
    </div>
    <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:16px;margin-bottom:16px">
      <div style="background:linear-gradient(145deg,#e5e7eb,#d1d5db);min-height:420px;border-radius:6px;display:flex;align-items:flex-end;padding:24px">
        <div style="background:rgba(255,255,255,0.92);padding:16px 18px;border-radius:4px;max-width:280px">
          <div style="font-size:0.75rem;color:#6b7280;margin-bottom:4px">Brand · Product</div>
          <div style="font-weight:600">Northwind rebrand</div>
        </div>
      </div>
      <div style="background:linear-gradient(145deg,#111827,#374151);min-height:420px;border-radius:6px;display:flex;align-items:flex-end;padding:24px">
        <div style="background:rgba(255,255,255,0.95);padding:16px 18px;border-radius:4px;max-width:260px">
          <div style="font-size:0.75rem;color:#6b7280;margin-bottom:4px">Web · Editorial</div>
          <div style="font-weight:600">Atelier Magazine</div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
      <div style="background:linear-gradient(145deg,#f3f4f6,#e5e7eb);min-height:260px;border-radius:6px;padding:20px;display:flex;align-items:flex-end"><div><div style="font-size:0.75rem;color:#6b7280">App</div><div style="font-weight:600;margin-top:4px">Pulse fitness</div></div></div>
      <div style="background:linear-gradient(145deg,#fef3c7,#fde68a);min-height:260px;border-radius:6px;padding:20px;display:flex;align-items:flex-end"><div><div style="font-size:0.75rem;color:#6b7280">Identity</div><div style="font-weight:600;margin-top:4px">Solace Ceramics</div></div></div>
      <div style="background:linear-gradient(145deg,#dbeafe,#93c5fd);min-height:260px;border-radius:6px;padding:20px;display:flex;align-items:flex-end"><div><div style="font-size:0.75rem;color:#6b7280">Campaign</div><div style="font-weight:600;margin-top:4px">City Lights Fest</div></div></div>
    </div>
  </div>
</section>

<section id="process" style="padding:80px 24px;background:#f9fafb">
  <div style="max-width:900px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:300;margin:0 0 40px;letter-spacing:-0.02em">How I work</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px">
      <div><div style="font-size:2rem;font-weight:200;color:#d1d5db;margin-bottom:8px">01</div><h3 style="font-weight:600;margin:0 0 8px">Discover</h3><p style="color:#6b7280;margin:0;line-height:1.65;font-size:0.95rem">Workshops, research, and constraints that make the problem sharp.</p></div>
      <div><div style="font-size:2rem;font-weight:200;color:#d1d5db;margin-bottom:8px">02</div><h3 style="font-weight:600;margin:0 0 8px">Design</h3><p style="color:#6b7280;margin:0;line-height:1.65;font-size:0.95rem">Systems, prototypes, and art direction with room for craft.</p></div>
      <div><div style="font-size:2rem;font-weight:200;color:#d1d5db;margin-bottom:8px">03</div><h3 style="font-weight:600;margin:0 0 8px">Deliver</h3><p style="color:#6b7280;margin:0;line-height:1.65;font-size:0.95rem">Handoff, motion specs, and support through launch.</p></div>
    </div>
  </div>
</section>

<section id="about" style="padding:96px 24px;background:#fff">
  <div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:0.9fr 1.1fr;gap:48px;align-items:center">
    <div style="min-height:360px;border-radius:6px;background:linear-gradient(160deg,#e5e7eb,#9ca3af)"></div>
    <div>
      <h2 style="font-size:2rem;font-weight:300;margin:0 0 1rem;letter-spacing:-0.02em">About Jane</h2>
      <p style="color:#4b5563;line-height:1.8;margin:0 0 1rem">I've spent 12 years designing brands and products for studios and in-house teams across Europe and the US. My work sits at the intersection of systems thinking and visual poetry.</p>
      <p style="color:#4b5563;line-height:1.8;margin:0 0 1.5rem">Previously: Design lead at Studio Forma · Senior product designer at Linear-ish tools you know.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <span style="padding:6px 12px;background:#f3f4f6;border-radius:999px;font-size:0.8rem;color:#4b5563">Brand systems</span>
        <span style="padding:6px 12px;background:#f3f4f6;border-radius:999px;font-size:0.8rem;color:#4b5563">Product UI</span>
        <span style="padding:6px 12px;background:#f3f4f6;border-radius:999px;font-size:0.8rem;color:#4b5563">Art direction</span>
      </div>
    </div>
  </div>
</section>

<section style="padding:56px 24px;border-top:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6">
  <div style="max-width:900px;margin:0 auto;text-align:center">
    <p style="font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;margin:0 0 24px">Selected clients</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:32px;color:#9ca3af;font-weight:600;letter-spacing:0.04em">
      <span>FORMA</span><span>NORTHWIND</span><span>PULSE</span><span>ATELIER</span><span>SOLACE</span>
    </div>
  </div>
</section>

<section id="contact" style="padding:96px 24px;text-align:center;background:#111827;color:#fff">
  <div style="max-width:520px;margin:0 auto">
    <h2 style="font-size:2.25rem;font-weight:300;margin:0 0 1rem;letter-spacing:-0.02em">Let's make something lasting</h2>
    <p style="opacity:0.7;margin:0 0 2rem;line-height:1.7">Projects start at a 4-week engagement. Tell me about your brand, product, or campaign.</p>
    <a href="mailto:hello@janedoe.design" style="display:inline-block;padding:14px 32px;border:1px solid rgba(255,255,255,0.35);color:#fff;border-radius:4px;text-decoration:none;letter-spacing:0.06em;font-size:0.9rem">HELLO@JANEDOE.DESIGN</a>
  </div>
</section>

<footer style="padding:28px 24px;text-align:center;color:#9ca3af;font-size:0.85rem">
  <div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <span>&copy; 2026 Jane Doe</span>
    <div style="display:flex;gap:20px"><span>Instagram</span><span>Behance</span><span>LinkedIn</span></div>
  </div>
</footer>
`.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // ECOMMERCE
  // ═══════════════════════════════════════════════════════════
  {
    id: "ecommerce-store",
    name: "Online Store",
    category: "ecommerce",
    description:
      "Full storefront: nav, hero, categories, products, benefits, promo, newsletter, footer",
    tags: ["ecommerce", "store", "shop", "retail", "products"],
    sections: 9,
    css: baseCss(),
    html: `
<nav style="padding:14px 24px;background:#fff;border-bottom:1px solid #f3e8ff">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:16px">
    <div style="font-size:1.4rem;font-weight:800;color:#7c3aed;letter-spacing:-0.02em">SHOPCO</div>
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
      <a href="#shop" style="color:#6b7280;text-decoration:none;font-weight:500">Shop</a>
      <a href="#collections" style="color:#6b7280;text-decoration:none;font-weight:500">Collections</a>
      <a href="#story" style="color:#6b7280;text-decoration:none;font-weight:500">Our story</a>
      <span style="font-weight:700;color:#7c3aed">Cart (0)</span>
    </div>
  </div>
</nav>

<section style="padding:100px 24px;background:radial-gradient(ellipse at top,#faf5ff 0%,#ffffff 60%);text-align:center">
  <div style="max-width:640px;margin:0 auto">
    <span style="display:inline-block;padding:6px 14px;background:#f3e8ff;color:#7c3aed;border-radius:999px;font-size:0.8rem;font-weight:600;margin-bottom:18px">Spring collection · Free shipping over $75</span>
    <h1 style="font-size:3.5rem;font-weight:800;color:#0f172a;margin:0 0 1rem;letter-spacing:-0.03em;line-height:1.1">Dress for the life you want</h1>
    <p style="font-size:1.15rem;color:#6b7280;margin:0 0 2rem;line-height:1.7">Curated essentials and statement pieces — designed to last, priced to love.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="#shop" style="display:inline-block;padding:14px 32px;background:#7c3aed;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;box-shadow:0 8px 24px rgba(124,58,237,0.3)">Shop now</a>
      <a href="#collections" style="display:inline-block;padding:12px 28px;border:1px solid #e9d5ff;color:#7c3aed;border-radius:12px;text-decoration:none;font-weight:600">Browse collections</a>
    </div>
  </div>
</section>

<section id="collections" style="padding:72px 24px;background:#fff">
  <div style="max-width:1100px;margin:0 auto">
    <h2 style="font-size:1.75rem;font-weight:800;margin:0 0 28px;color:#0f172a">Shop by category</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
      <div style="border-radius:16px;min-height:200px;background:linear-gradient(160deg,#c4b5fd,#a78bfa);padding:20px;display:flex;align-items:flex-end;color:#fff;font-weight:700">Women</div>
      <div style="border-radius:16px;min-height:200px;background:linear-gradient(160deg,#93c5fd,#60a5fa);padding:20px;display:flex;align-items:flex-end;color:#fff;font-weight:700">Men</div>
      <div style="border-radius:16px;min-height:200px;background:linear-gradient(160deg,#f9a8d4,#f472b6);padding:20px;display:flex;align-items:flex-end;color:#fff;font-weight:700">Accessories</div>
      <div style="border-radius:16px;min-height:200px;background:linear-gradient(160deg,#fcd34d,#fbbf24);padding:20px;display:flex;align-items:flex-end;color:#fff;font-weight:700">Sale</div>
    </div>
  </div>
</section>

<section id="shop" style="padding:80px 24px;background:#fafafa">
  <div style="max-width:1200px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:end;margin-bottom:28px;flex-wrap:wrap;gap:12px">
      <h2 style="font-size:1.75rem;font-weight:800;margin:0;color:#0f172a">Bestsellers</h2>
      <a href="#" style="color:#7c3aed;font-weight:600;text-decoration:none">View all →</a>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
      <div>
        <div style="background:linear-gradient(145deg,#ede9fe,#ddd6fe);height:280px;border-radius:14px;margin-bottom:12px;position:relative">
          <span style="position:absolute;top:12px;left:12px;background:#7c3aed;color:#fff;font-size:0.7rem;font-weight:700;padding:4px 8px;border-radius:6px">NEW</span>
        </div>
        <p style="font-weight:600;margin:0 0 4px;color:#0f172a">Classic Tee</p>
        <p style="color:#7c3aed;font-weight:700;margin:0">$29.00</p>
      </div>
      <div>
        <div style="background:linear-gradient(145deg,#e0e7ff,#c7d2fe);height:280px;border-radius:14px;margin-bottom:12px"></div>
        <p style="font-weight:600;margin:0 0 4px;color:#0f172a">Denim Jacket</p>
        <p style="color:#7c3aed;font-weight:700;margin:0">$89.00</p>
      </div>
      <div>
        <div style="background:linear-gradient(145deg,#fce7f3,#fbcfe8);height:280px;border-radius:14px;margin-bottom:12px"></div>
        <p style="font-weight:600;margin:0 0 4px;color:#0f172a">Leather Bag</p>
        <p style="color:#7c3aed;font-weight:700;margin:0">$149.00</p>
      </div>
      <div>
        <div style="background:linear-gradient(145deg,#ecfccb,#d9f99d);height:280px;border-radius:14px;margin-bottom:12px"></div>
        <p style="font-weight:600;margin:0 0 4px;color:#0f172a">Sneakers</p>
        <p style="color:#7c3aed;font-weight:700;margin:0"><span style="text-decoration:line-through;color:#9ca3af;font-weight:500;margin-right:6px">$99</span>$79.00</p>
      </div>
    </div>
  </div>
</section>

<section style="padding:72px 24px;background:#fff">
  <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:28px;text-align:center">
    <div><div style="font-size:1.5rem;margin-bottom:10px">🚚</div><h3 style="font-weight:700;margin:0 0 6px">Free shipping</h3><p style="color:#6b7280;margin:0;font-size:0.95rem">On orders over $75 worldwide</p></div>
    <div><div style="font-size:1.5rem;margin-bottom:10px">↩️</div><h3 style="font-weight:700;margin:0 0 6px">Easy returns</h3><p style="color:#6b7280;margin:0;font-size:0.95rem">30-day hassle-free returns</p></div>
    <div><div style="font-size:1.5rem;margin-bottom:10px">🔒</div><h3 style="font-weight:700;margin:0 0 6px">Secure checkout</h3><p style="color:#6b7280;margin:0;font-size:0.95rem">Encrypted payments & buyer protection</p></div>
  </div>
</section>

<section id="story" style="padding:0;background:#1e1b4b;color:#fff">
  <div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;min-height:360px">
    <div style="padding:64px 48px;display:flex;flex-direction:column;justify-content:center">
      <h2 style="font-size:2rem;font-weight:800;margin:0 0 1rem;letter-spacing:-0.02em">Crafted with intention</h2>
      <p style="opacity:0.85;line-height:1.75;margin:0 0 1.5rem">Every SHOPCO piece is made in small batches with responsible materials. We partner with factories that pay fair wages and reduce waste.</p>
      <a href="#" style="color:#c4b5fd;font-weight:600;text-decoration:none;width:fit-content">Read our story →</a>
    </div>
    <div style="background:linear-gradient(145deg,#7c3aed,#a855f7);min-height:280px"></div>
  </div>
</section>

<section style="padding:72px 24px;background:#faf5ff;text-align:center">
  <div style="max-width:480px;margin:0 auto">
    <h3 style="font-size:1.5rem;font-weight:800;margin:0 0 0.5rem;color:#0f172a">Join the list</h3>
    <p style="color:#6b7280;margin:0 0 1.25rem">Early access to drops and 10% off your first order.</p>
    <form style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
      <input type="email" placeholder="Email address" style="flex:1;min-width:200px;padding:12px 14px;border:1px solid #e9d5ff;border-radius:10px;background:#fff" />
      <button type="submit" style="padding:12px 22px;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer">Subscribe</button>
    </form>
  </div>
</section>

<footer style="background:#0f172a;color:#e2e8f0;padding:56px 24px 24px">
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px">
    <div>
      <div style="font-weight:800;font-size:1.2rem;color:#fff;margin-bottom:10px">SHOPCO</div>
      <p style="color:#94a3b8;margin:0;line-height:1.6;font-size:0.9rem">Modern essentials for everyday style.</p>
    </div>
    <div><div style="font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#cbd5e1;margin-bottom:12px">Shop</div><ul style="color:#94a3b8;line-height:2;margin:0;padding:0;font-size:0.9rem"><li>New arrivals</li><li>Bestsellers</li><li>Sale</li></ul></div>
    <div><div style="font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#cbd5e1;margin-bottom:12px">Help</div><ul style="color:#94a3b8;line-height:2;margin:0;padding:0;font-size:0.9rem"><li>Shipping</li><li>Returns</li><li>FAQ</li></ul></div>
    <div><div style="font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#cbd5e1;margin-bottom:12px">Social</div><ul style="color:#94a3b8;line-height:2;margin:0;padding:0;font-size:0.9rem"><li>Instagram</li><li>TikTok</li><li>Pinterest</li></ul></div>
  </div>
  <div style="max-width:1100px;margin:36px auto 0;padding-top:20px;border-top:1px solid #1e293b;text-align:center;color:#64748b;font-size:0.85rem">&copy; 2026 SHOPCO. All rights reserved.</div>
</footer>
`.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // HEALTH
  // ═══════════════════════════════════════════════════════════
  {
    id: "wellness-center",
    name: "Wellness Center",
    category: "health",
    description:
      "Full spa/wellness site: hero, services, packages, team, testimonials, booking, footer",
    tags: ["health", "spa", "yoga", "wellness", "fitness", "gym"],
    sections: 8,
    css: baseCss({
      font: "Georgia, serif",
      color: "#064e3b",
      bg: "#f0fdf4",
    }),
    html: `
<nav style="padding:14px 24px;background:#fff;border-bottom:1px solid #d1fae5">
  <div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:16px">
    <div style="font-size:1.35rem;font-weight:400;color:#047857">Serenity</div>
    <div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap;font-family:-apple-system,sans-serif;font-size:0.9rem">
      <a href="#services" style="color:#64748b;text-decoration:none;font-weight:500">Services</a>
      <a href="#packages" style="color:#64748b;text-decoration:none;font-weight:500">Packages</a>
      <a href="#team" style="color:#64748b;text-decoration:none;font-weight:500">Practitioners</a>
      <a href="#book" style="padding:9px 18px;background:#047857;color:#fff;border-radius:999px;text-decoration:none;font-weight:600">Book now</a>
    </div>
  </div>
</nav>

<section style="padding:120px 24px;background:linear-gradient(135deg,#047857,#059669);color:#fff;text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <p style="font-family:-apple-system,sans-serif;letter-spacing:0.16em;text-transform:uppercase;font-size:0.75rem;opacity:0.85;margin:0 0 16px">Spa · Yoga · Wellness</p>
    <h1 style="font-size:3.5rem;font-weight:300;margin:0 0 1rem;line-height:1.15">Restore balance to mind, body & spirit</h1>
    <p style="font-size:1.15rem;opacity:0.9;margin:0 0 2rem;font-family:-apple-system,sans-serif;line-height:1.7">Holistic care in a calm sanctuary — treatments, movement, and rituals designed around you.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;font-family:-apple-system,sans-serif">
      <a href="#book" style="padding:14px 32px;background:#fff;color:#047857;border-radius:999px;text-decoration:none;font-weight:700">Book a session</a>
      <a href="#services" style="padding:12px 28px;border:2px solid rgba(255,255,255,0.45);color:#fff;border-radius:999px;text-decoration:none;font-weight:600">View services</a>
    </div>
  </div>
</section>

<section id="services" style="padding:96px 24px;background:#f0fdf4">
  <div style="max-width:1000px;margin:0 auto">
    <h2 style="text-align:center;font-size:2.25rem;font-weight:400;margin:0 0 40px;color:#047857">Our services</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;font-family:-apple-system,sans-serif">
      <div style="text-align:center;padding:32px 24px;background:#fff;border-radius:20px;box-shadow:0 2px 12px rgba(4,120,87,0.06)">
        <div style="font-size:2.5rem;margin-bottom:12px">💆</div>
        <h3 style="font-weight:700;margin:0 0 8px;color:#064e3b">Massage therapy</h3>
        <p style="color:#6b7280;margin:0 0 12px;line-height:1.6;font-size:0.95rem">Swedish, deep tissue, hot stone, and prenatal — tailored pressure.</p>
        <div style="color:#047857;font-weight:700">from $95</div>
      </div>
      <div style="text-align:center;padding:32px 24px;background:#fff;border-radius:20px;box-shadow:0 2px 12px rgba(4,120,87,0.06)">
        <div style="font-size:2.5rem;margin-bottom:12px">🧘</div>
        <h3 style="font-weight:700;margin:0 0 8px;color:#064e3b">Yoga & movement</h3>
        <p style="color:#6b7280;margin:0 0 12px;line-height:1.6;font-size:0.95rem">Daily classes from gentle restorative to power flow. All levels welcome.</p>
        <div style="color:#047857;font-weight:700">from $22</div>
      </div>
      <div style="text-align:center;padding:32px 24px;background:#fff;border-radius:20px;box-shadow:0 2px 12px rgba(4,120,87,0.06)">
        <div style="font-size:2.5rem;margin-bottom:12px">🧖</div>
        <h3 style="font-weight:700;margin:0 0 8px;color:#064e3b">Facial treatments</h3>
        <p style="color:#6b7280;margin:0 0 12px;line-height:1.6;font-size:0.95rem">Organic facials, LED therapy, and custom skin protocols.</p>
        <div style="color:#047857;font-weight:700">from $110</div>
      </div>
    </div>
  </div>
</section>

<section id="packages" style="padding:88px 24px;background:#fff">
  <div style="max-width:1000px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:400;margin:0 0 36px;color:#047857">Wellness packages</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;font-family:-apple-system,sans-serif">
      <div style="padding:28px;border:1px solid #d1fae5;border-radius:18px">
        <h3 style="font-weight:700;margin:0 0 8px">Day Reset</h3>
        <div style="font-size:2rem;font-weight:800;color:#047857;margin-bottom:12px">$189</div>
        <ul style="color:#6b7280;line-height:2;margin:0;padding:0;font-size:0.9rem"><li>✓ 60-min massage</li><li>✓ Express facial</li><li>✓ Herbal tea ritual</li></ul>
      </div>
      <div style="padding:28px;border:2px solid #047857;border-radius:18px;background:#ecfdf5;position:relative">
        <span style="position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:#047857;color:#fff;font-size:0.7rem;font-weight:700;padding:4px 12px;border-radius:999px">Popular</span>
        <h3 style="font-weight:700;margin:4px 0 8px">Monthly Flow</h3>
        <div style="font-size:2rem;font-weight:800;color:#047857;margin-bottom:12px">$249<span style="font-size:0.9rem;font-weight:500;color:#6b7280">/mo</span></div>
        <ul style="color:#6b7280;line-height:2;margin:0;padding:0;font-size:0.9rem"><li>✓ Unlimited yoga</li><li>✓ 1 massage / month</li><li>✓ Sauna access</li></ul>
      </div>
      <div style="padding:28px;border:1px solid #d1fae5;border-radius:18px">
        <h3 style="font-weight:700;margin:0 0 8px">Couples Escape</h3>
        <div style="font-size:2rem;font-weight:800;color:#047857;margin-bottom:12px">$320</div>
        <ul style="color:#6b7280;line-height:2;margin:0;padding:0;font-size:0.9rem"><li>✓ Dual massage suite</li><li>✓ Private steam</li><li>✓ Champagne toast</li></ul>
      </div>
    </div>
  </div>
</section>

<section id="team" style="padding:88px 24px;background:#ecfdf5">
  <div style="max-width:900px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:400;margin:0 0 36px;color:#047857">Practitioners</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;font-family:-apple-system,sans-serif;text-align:center">
      <div style="background:#fff;padding:24px;border-radius:16px"><div style="width:72px;height:72px;border-radius:50%;margin:0 auto 12px;background:linear-gradient(135deg,#34d399,#059669)"></div><div style="font-weight:700">Maya Chen</div><div style="color:#6b7280;font-size:0.85rem;margin-top:4px">Lead therapist</div></div>
      <div style="background:#fff;padding:24px;border-radius:16px"><div style="width:72px;height:72px;border-radius:50%;margin:0 auto 12px;background:linear-gradient(135deg,#6ee7b7,#10b981)"></div><div style="font-weight:700">Noah Ellis</div><div style="color:#6b7280;font-size:0.85rem;margin-top:4px">Yoga director</div></div>
      <div style="background:#fff;padding:24px;border-radius:16px"><div style="width:72px;height:72px;border-radius:50%;margin:0 auto 12px;background:linear-gradient(135deg,#a7f3d0,#047857)"></div><div style="font-weight:700">Lina Okonkwo</div><div style="color:#6b7280;font-size:0.85rem;margin-top:4px">Esthetician</div></div>
    </div>
  </div>
</section>

<section style="padding:80px 24px;background:#fff;text-align:center">
  <div style="max-width:640px;margin:0 auto;font-family:-apple-system,sans-serif">
    <div style="color:#f59e0b;margin-bottom:14px">★★★★★</div>
    <p style="font-size:1.2rem;line-height:1.7;color:#334155;font-style:italic;margin:0 0 1.25rem;font-family:Georgia,serif">"The quietest, kindest spa experience I've had. I leave every visit lighter."</p>
    <div style="font-weight:700;color:#064e3b">Elena V.</div>
    <div style="color:#6b7280;font-size:0.9rem">Member since 2023</div>
  </div>
</section>

<section id="book" style="padding:88px 24px;background:linear-gradient(135deg,#064e3b,#047857);color:#fff;text-align:center">
  <div style="max-width:480px;margin:0 auto;font-family:-apple-system,sans-serif">
    <h2 style="font-size:2rem;font-weight:400;margin:0 0 0.75rem;font-family:Georgia,serif">Book your visit</h2>
    <p style="opacity:0.9;margin:0 0 1.5rem;line-height:1.65">Open daily 8am–8pm · Walk-ins welcome for yoga</p>
    <a href="#" style="display:inline-block;padding:14px 32px;background:#fff;color:#047857;border-radius:999px;text-decoration:none;font-weight:700">Schedule online</a>
    <p style="margin:20px 0 0;opacity:0.8;font-size:0.9rem">(555) 987-6543 · hello@serenityspa.com</p>
  </div>
</section>

<footer style="background:#022c22;color:#a7f3d0;padding:36px 24px;text-align:center;font-family:-apple-system,sans-serif;font-size:0.9rem">
  <div style="font-family:Georgia,serif;font-size:1.2rem;color:#fff;margin-bottom:8px">Serenity Spa & Wellness</div>
  <div style="opacity:0.8">88 Garden Lane · Open daily</div>
  <div style="margin-top:16px;opacity:0.6;font-size:0.8rem">&copy; 2026 Serenity</div>
</footer>
`.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // EDUCATION
  // ═══════════════════════════════════════════════════════════
  {
    id: "education-academy",
    name: "Online Academy",
    category: "education",
    description:
      "Full learning platform: nav, hero, stats, courses, benefits, instructors, FAQ, CTA, footer",
    tags: ["education", "courses", "learning", "school", "academy"],
    sections: 9,
    css: baseCss(),
    html: `
<nav style="padding:14px 24px;background:#fff;border-bottom:1px solid #e2e8f0">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:16px">
    <div style="font-size:1.3rem;font-weight:800;color:#1e3a5f">Learnly</div>
    <div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
      <a href="#courses" style="color:#64748b;text-decoration:none;font-weight:500">Courses</a>
      <a href="#why" style="color:#64748b;text-decoration:none;font-weight:500">Why Learnly</a>
      <a href="#instructors" style="color:#64748b;text-decoration:none;font-weight:500">Instructors</a>
      <a href="#cta" style="padding:9px 18px;background:#f59e0b;color:#1e3a5f;border-radius:8px;text-decoration:none;font-weight:700">Start free</a>
    </div>
  </div>
</nav>

<section style="padding:100px 24px;background:linear-gradient(160deg,#1e3a5f 0%,#0f2744 100%);color:#fff;text-align:center">
  <div style="max-width:720px;margin:0 auto">
    <span style="display:inline-block;padding:6px 14px;background:rgba(245,158,11,0.2);color:#fbbf24;border-radius:999px;font-size:0.8rem;font-weight:600;margin-bottom:18px">500+ expert-led courses</span>
    <h1 style="font-size:3.25rem;font-weight:800;margin:0 0 1rem;letter-spacing:-0.03em;line-height:1.12">Learn from the best. On your schedule.</h1>
    <p style="font-size:1.15rem;opacity:0.88;margin:0 0 2rem;line-height:1.7">Career-ready programs in tech, design, and business — with projects that build a portfolio, not just a certificate.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="#cta" style="padding:14px 28px;background:#f59e0b;color:#1e3a5f;border-radius:10px;text-decoration:none;font-weight:800">Start learning free</a>
      <a href="#courses" style="padding:12px 26px;border:2px solid rgba(255,255,255,0.3);color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Browse courses</a>
    </div>
  </div>
</section>

<section style="padding:48px 24px;background:#fff;border-bottom:1px solid #f1f5f9">
  <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center">
    <div><div style="font-size:1.75rem;font-weight:800;color:#1e3a5f">120k+</div><div style="color:#64748b;font-size:0.9rem;margin-top:4px">Students</div></div>
    <div><div style="font-size:1.75rem;font-weight:800;color:#1e3a5f">500+</div><div style="color:#64748b;font-size:0.9rem;margin-top:4px">Courses</div></div>
    <div><div style="font-size:1.75rem;font-weight:800;color:#1e3a5f">4.8★</div><div style="color:#64748b;font-size:0.9rem;margin-top:4px">Avg. rating</div></div>
    <div><div style="font-size:1.75rem;font-weight:800;color:#1e3a5f">85%</div><div style="color:#64748b;font-size:0.9rem;margin-top:4px">Completion rate</div></div>
  </div>
</section>

<section id="courses" style="padding:88px 24px;background:#f8fafc">
  <div style="max-width:1100px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:800;margin:0 0 36px;color:#0f172a">Popular courses</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,0.04)">
        <div style="height:160px;background:linear-gradient(135deg,#3b82f6,#8b5cf6)"></div>
        <div style="padding:18px">
          <span style="color:#3b82f6;font-size:0.8rem;font-weight:700">Web development</span>
          <h4 style="font-weight:700;margin:8px 0;color:#0f172a">Full-Stack JavaScript</h4>
          <p style="color:#64748b;font-size:0.9rem;margin:0 0 12px">12 weeks · Intermediate</p>
          <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:800;color:#0f172a">$449</span><span style="color:#f59e0b;font-size:0.85rem">★★★★★</span></div>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,0.04)">
        <div style="height:160px;background:linear-gradient(135deg,#10b981,#34d399)"></div>
        <div style="padding:18px">
          <span style="color:#10b981;font-size:0.8rem;font-weight:700">Data science</span>
          <h4 style="font-weight:700;margin:8px 0;color:#0f172a">Python for Data Analysis</h4>
          <p style="color:#64748b;font-size:0.9rem;margin:0 0 12px">8 weeks · Beginner</p>
          <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:800;color:#0f172a">$329</span><span style="color:#f59e0b;font-size:0.85rem">★★★★★</span></div>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,0.04)">
        <div style="height:160px;background:linear-gradient(135deg,#f59e0b,#fbbf24)"></div>
        <div style="padding:18px">
          <span style="color:#d97706;font-size:0.8rem;font-weight:700">Design</span>
          <h4 style="font-weight:700;margin:8px 0;color:#0f172a">UI/UX Design Masterclass</h4>
          <p style="color:#64748b;font-size:0.9rem;margin:0 0 12px">6 weeks · All levels</p>
          <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:800;color:#0f172a">$299</span><span style="color:#f59e0b;font-size:0.85rem">★★★★☆</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="why" style="padding:88px 24px;background:#fff">
  <div style="max-width:1000px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:800;margin:0 0 40px">Why students choose Learnly</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px">
      <div><div style="font-size:1.5rem;margin-bottom:10px">🎯</div><h3 style="font-weight:700;margin:0 0 8px">Project-based</h3><p style="color:#64748b;margin:0;line-height:1.65">Ship real portfolio pieces every module — not just quizzes.</p></div>
      <div><div style="font-size:1.5rem;margin-bottom:10px">👨‍🏫</div><h3 style="font-weight:700;margin:0 0 8px">Mentor support</h3><p style="color:#64748b;margin:0;line-height:1.65">Office hours and code reviews with working practitioners.</p></div>
      <div><div style="font-size:1.5rem;margin-bottom:10px">📜</div><h3 style="font-weight:700;margin:0 0 8px">Certificates</h3><p style="color:#64748b;margin:0;line-height:1.65">Shareable credentials verified on LinkedIn and your resume.</p></div>
    </div>
  </div>
</section>

<section id="instructors" style="padding:80px 24px;background:#f8fafc">
  <div style="max-width:900px;margin:0 auto">
    <h2 style="text-align:center;font-size:1.75rem;font-weight:800;margin:0 0 32px">Featured instructors</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:center">
      <div style="background:#fff;padding:24px;border-radius:14px;border:1px solid #e2e8f0"><div style="width:64px;height:64px;border-radius:50%;margin:0 auto 12px;background:linear-gradient(135deg,#3b82f6,#6366f1)"></div><div style="font-weight:700">Chris Novak</div><div style="color:#64748b;font-size:0.85rem;margin-top:4px">Ex-Google · Engineering</div></div>
      <div style="background:#fff;padding:24px;border-radius:14px;border:1px solid #e2e8f0"><div style="width:64px;height:64px;border-radius:50%;margin:0 auto 12px;background:linear-gradient(135deg,#10b981,#059669)"></div><div style="font-weight:700">Aisha Rahman</div><div style="color:#64748b;font-size:0.85rem;margin-top:4px">Data scientist · Meta</div></div>
      <div style="background:#fff;padding:24px;border-radius:14px;border:1px solid #e2e8f0"><div style="width:64px;height:64px;border-radius:50%;margin:0 auto 12px;background:linear-gradient(135deg,#f59e0b,#ea580c)"></div><div style="font-weight:700">Sofia Mendes</div><div style="color:#64748b;font-size:0.85rem;margin-top:4px">Design lead · Figma community</div></div>
    </div>
  </div>
</section>

<section style="padding:72px 24px;background:#fff">
  <div style="max-width:700px;margin:0 auto">
    <h2 style="text-align:center;font-size:1.75rem;font-weight:800;margin:0 0 28px">FAQ</h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="padding:18px 20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0"><h4 style="margin:0 0 6px;font-weight:700">Do I need prior experience?</h4><p style="margin:0;color:#64748b;font-size:0.95rem;line-height:1.6">Many courses start at beginner. Each page lists prerequisites clearly.</p></div>
      <div style="padding:18px 20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0"><h4 style="margin:0 0 6px;font-weight:700">Is there a free trial?</h4><p style="margin:0;color:#64748b;font-size:0.95rem;line-height:1.6">Yes — 7 days free access to intro modules on every paid track.</p></div>
      <div style="padding:18px 20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0"><h4 style="margin:0 0 6px;font-weight:700">Can I get a refund?</h4><p style="margin:0;color:#64748b;font-size:0.95rem;line-height:1.6">Full refund within 14 days if you've completed under 20% of the course.</p></div>
    </div>
  </div>
</section>

<section id="cta" style="padding:72px 24px;background:#1e3a5f;color:#fff;text-align:center">
  <div style="max-width:520px;margin:0 auto">
    <h2 style="font-size:2rem;font-weight:800;margin:0 0 0.75rem">Start free today</h2>
    <p style="opacity:0.85;margin:0 0 1.5rem;line-height:1.65">No credit card for the free tier. Upgrade when you're ready.</p>
    <a href="#" style="display:inline-block;padding:14px 32px;background:#f59e0b;color:#1e3a5f;border-radius:10px;text-decoration:none;font-weight:800">Create free account</a>
  </div>
</section>

<footer style="background:#0f172a;color:#94a3b8;padding:40px 24px;text-align:center;font-size:0.9rem">
  <div style="font-weight:800;color:#fff;margin-bottom:8px">Learnly</div>
  <div>&copy; 2026 Learnly Academy · Terms · Privacy</div>
</footer>
`.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // SAAS LANDING
  // ═══════════════════════════════════════════════════════════
  {
    id: "saas-landing",
    name: "SaaS Landing",
    category: "landing",
    description:
      "Full SaaS landing: nav, hero, logos, features, how-it-works, pricing, testimonials, FAQ, CTA, footer",
    tags: ["saas", "startup", "product", "tech", "landing"],
    sections: 10,
    css: baseCss(),
    html: `
<nav style="padding:14px 24px;background:rgba(255,255,255,0.9);border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:40;backdrop-filter:blur(8px)">
  <div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:16px">
    <div style="font-size:1.25rem;font-weight:800;color:#2563eb">Flowbase</div>
    <div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
      <a href="#features" style="color:#64748b;text-decoration:none;font-weight:500;font-size:0.95rem">Features</a>
      <a href="#pricing" style="color:#64748b;text-decoration:none;font-weight:500;font-size:0.95rem">Pricing</a>
      <a href="#faq" style="color:#64748b;text-decoration:none;font-weight:500;font-size:0.95rem">FAQ</a>
      <a href="#cta" style="padding:9px 18px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:0.9rem">Start free</a>
    </div>
  </div>
</nav>

<section style="padding:100px 24px 80px;text-align:center;background:radial-gradient(ellipse 70% 50% at 50% 0%,#dbeafe 0%,#ffffff 55%)">
  <div style="max-width:720px;margin:0 auto">
    <span style="display:inline-block;padding:6px 14px;background:#eff6ff;color:#2563eb;border-radius:999px;font-size:0.8rem;font-weight:600;margin-bottom:18px">🚀 Now with AI-powered workflows</span>
    <h1 style="font-size:3.5rem;font-weight:800;line-height:1.1;letter-spacing:-0.03em;margin:0 0 1.25rem;color:#0f172a">Your workflow.<br/>Supercharged.</h1>
    <p style="font-size:1.2rem;color:#64748b;margin:0 0 2rem;line-height:1.7">The all-in-one platform that helps teams move faster, collaborate better, and deliver results without the chaos.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="#cta" style="padding:14px 28px;background:#2563eb;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;box-shadow:0 8px 24px rgba(37,99,235,0.3)">Start free trial</a>
      <a href="#features" style="padding:12px 26px;background:#fff;color:#2563eb;border:2px solid #e2e8f0;border-radius:12px;text-decoration:none;font-weight:600">Watch demo</a>
    </div>
    <p style="color:#94a3b8;margin-top:14px;font-size:0.875rem">No credit card · 14-day free trial</p>
  </div>
</section>

<section style="padding:36px 24px;border-bottom:1px solid #f1f5f9">
  <div style="max-width:900px;margin:0 auto;text-align:center">
    <p style="font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;margin:0 0 18px">Trusted by product teams at</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:32px;color:#94a3b8;font-weight:800;opacity:0.7">
      <span>ACME</span><span>GLOBEX</span><span>INITECH</span><span>UMBRELLA</span><span>STARK</span>
    </div>
  </div>
</section>

<section id="features" style="padding:88px 24px;background:#f8fafc">
  <div style="max-width:1100px;margin:0 auto">
    <div style="text-align:center;max-width:520px;margin:0 auto 48px">
      <h2 style="font-size:2.25rem;font-weight:800;margin:0 0 0.75rem;letter-spacing:-0.02em;color:#0f172a">Everything you need to ship</h2>
      <p style="color:#64748b;margin:0;line-height:1.65">Replace five tools with one workspace your team actually opens every day.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
      <div style="background:#fff;padding:28px;border-radius:16px;border:1px solid #e2e8f0"><div style="font-size:1.75rem;margin-bottom:12px">⚡</div><h3 style="font-weight:700;margin:0 0 8px">Lightning fast</h3><p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Sub-second search and real-time collaboration on every plan.</p></div>
      <div style="background:#fff;padding:28px;border-radius:16px;border:1px solid #e2e8f0"><div style="font-size:1.75rem;margin-bottom:12px">🔐</div><h3 style="font-weight:700;margin:0 0 8px">Enterprise security</h3><p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">SSO, SOC 2, audit logs, and granular permissions.</p></div>
      <div style="background:#fff;padding:28px;border-radius:16px;border:1px solid #e2e8f0"><div style="font-size:1.75rem;margin-bottom:12px">🔄</div><h3 style="font-weight:700;margin:0 0 8px">200+ integrations</h3><p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Connect Slack, GitHub, Notion, Linear, and more in minutes.</p></div>
      <div style="background:#fff;padding:28px;border-radius:16px;border:1px solid #e2e8f0"><div style="font-size:1.75rem;margin-bottom:12px">📊</div><h3 style="font-weight:700;margin:0 0 8px">Live analytics</h3><p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Dashboards for throughput, cycle time, and team health.</p></div>
      <div style="background:#fff;padding:28px;border-radius:16px;border:1px solid #e2e8f0"><div style="font-size:1.75rem;margin-bottom:12px">🤖</div><h3 style="font-weight:700;margin:0 0 8px">AI assist</h3><p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Summaries, draft updates, and smart routing built in.</p></div>
      <div style="background:#fff;padding:28px;border-radius:16px;border:1px solid #e2e8f0"><div style="font-size:1.75rem;margin-bottom:12px">📱</div><h3 style="font-weight:700;margin:0 0 8px">Mobile ready</h3><p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Native-feeling apps for iOS and Android with offline mode.</p></div>
    </div>
  </div>
</section>

<section style="padding:88px 24px;background:#fff">
  <div style="max-width:900px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:800;margin:0 0 40px">How it works</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px;text-align:center">
      <div><div style="width:44px;height:44px;border-radius:12px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-weight:800">1</div><h3 style="font-weight:700;margin:0 0 8px">Connect tools</h3><p style="color:#64748b;margin:0;font-size:0.95rem;line-height:1.6">Import projects and people in under 10 minutes.</p></div>
      <div><div style="width:44px;height:44px;border-radius:12px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-weight:800">2</div><h3 style="font-weight:700;margin:0 0 8px">Set workflows</h3><p style="color:#64748b;margin:0;font-size:0.95rem;line-height:1.6">Templates for product, marketing, and ops out of the box.</p></div>
      <div><div style="width:44px;height:44px;border-radius:12px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-weight:800">3</div><h3 style="font-weight:700;margin:0 0 8px">Ship faster</h3><p style="color:#64748b;margin:0;font-size:0.95rem;line-height:1.6">Track progress and automate the boring status updates.</p></div>
    </div>
  </div>
</section>

<section id="pricing" style="padding:88px 24px;background:#f8fafc">
  <div style="max-width:900px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:800;margin:0 0 12px">Simple pricing</h2>
    <p style="text-align:center;color:#64748b;margin:0 0 40px">Transparent plans. Cancel anytime.</p>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px">
      <div style="text-align:center;padding:36px 28px;background:#fff;border:1px solid #e2e8f0;border-radius:20px">
        <p style="font-weight:700;margin:0 0 8px">Starter</p>
        <div style="font-size:3rem;font-weight:800;letter-spacing:-0.03em">$19<span style="font-size:1rem;color:#64748b;font-weight:500">/mo</span></div>
        <ul style="list-style:none;padding:0;margin:1.5rem 0;color:#64748b;line-height:2.1;text-align:left;max-width:220px;margin-left:auto;margin-right:auto"><li>✓ 5 team members</li><li>✓ 10 projects</li><li>✓ Basic analytics</li><li>✓ Email support</li></ul>
        <a href="#" style="display:block;padding:12px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Get started</a>
      </div>
      <div style="text-align:center;padding:36px 28px;background:#eff6ff;border:2px solid #2563eb;border-radius:20px">
        <p style="font-weight:700;margin:0 0 8px">Pro</p>
        <div style="font-size:3rem;font-weight:800;letter-spacing:-0.03em">$49<span style="font-size:1rem;color:#64748b;font-weight:500">/mo</span></div>
        <ul style="list-style:none;padding:0;margin:1.5rem 0;color:#64748b;line-height:2.1;text-align:left;max-width:220px;margin-left:auto;margin-right:auto"><li>✓ Unlimited members</li><li>✓ Unlimited projects</li><li>✓ Advanced analytics</li><li>✓ Priority support</li><li>✓ API access</li></ul>
        <a href="#" style="display:block;padding:12px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Get started</a>
      </div>
    </div>
  </div>
</section>

<section style="padding:80px 24px;background:#fff">
  <div style="max-width:1000px;margin:0 auto">
    <h2 style="text-align:center;font-size:1.75rem;font-weight:800;margin:0 0 32px">Loved by teams</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px">
      <div style="padding:22px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc"><div style="color:#f59e0b;margin-bottom:10px">★★★★★</div><p style="color:#334155;line-height:1.6;margin:0 0 14px;font-size:0.95rem">"We cut status-meeting time in half in the first month."</p><div style="font-weight:700;font-size:0.9rem">Sam Chen · Growth</div></div>
      <div style="padding:22px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc"><div style="color:#f59e0b;margin-bottom:10px">★★★★★</div><p style="color:#334155;line-height:1.6;margin:0 0 14px;font-size:0.95rem">"Finally one place for roadmap, docs, and delivery."</p><div style="font-weight:700;font-size:0.9rem">Priya Nair · Product</div></div>
      <div style="padding:22px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc"><div style="color:#f59e0b;margin-bottom:10px">★★★★★</div><p style="color:#334155;line-height:1.6;margin:0 0 14px;font-size:0.95rem">"Security review was painless. IT actually approved it."</p><div style="font-weight:700;font-size:0.9rem">Marcus Webb · Ops</div></div>
    </div>
  </div>
</section>

<section id="faq" style="padding:72px 24px;background:#f8fafc">
  <div style="max-width:680px;margin:0 auto">
    <h2 style="text-align:center;font-size:1.75rem;font-weight:800;margin:0 0 28px">FAQ</h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="padding:18px;background:#fff;border-radius:12px;border:1px solid #e2e8f0"><h4 style="margin:0 0 6px;font-weight:700">Can I switch plans later?</h4><p style="margin:0;color:#64748b;font-size:0.95rem">Yes — upgrade or downgrade anytime. Prorated automatically.</p></div>
      <div style="padding:18px;background:#fff;border-radius:12px;border:1px solid #e2e8f0"><h4 style="margin:0 0 6px;font-weight:700">Do you offer annual billing?</h4><p style="margin:0;color:#64748b;font-size:0.95rem">Yes — save 20% with annual plans on Starter and Pro.</p></div>
      <div style="padding:18px;background:#fff;border-radius:12px;border:1px solid #e2e8f0"><h4 style="margin:0 0 6px;font-weight:700">Is there an enterprise plan?</h4><p style="margin:0;color:#64748b;font-size:0.95rem">Custom contracts, dedicated support, and on-prem options available.</p></div>
    </div>
  </div>
</section>

<section id="cta" style="padding:72px 24px">
  <div style="max-width:900px;margin:0 auto;padding:48px 36px;text-align:center;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;border-radius:24px">
    <h2 style="font-size:2rem;font-weight:800;margin:0 0 0.75rem">Ready to supercharge your workflow?</h2>
    <p style="opacity:0.9;margin:0 0 1.5rem">Join 10,000+ teams already shipping with Flowbase.</p>
    <a href="#" style="display:inline-block;padding:14px 28px;background:#fff;color:#2563eb;border-radius:12px;text-decoration:none;font-weight:700">Start free trial</a>
  </div>
</section>

<footer style="background:#0f172a;color:#94a3b8;padding:48px 24px 24px">
  <div style="max-width:1000px;margin:0 auto;display:flex;justify-content:space-between;flex-wrap:wrap;gap:20px">
    <div style="font-weight:800;color:#fff">Flowbase</div>
    <div style="display:flex;gap:20px;font-size:0.9rem"><span>Product</span><span>Pricing</span><span>Docs</span><span>Security</span></div>
  </div>
  <div style="max-width:1000px;margin:28px auto 0;padding-top:16px;border-top:1px solid #1e293b;text-align:center;font-size:0.85rem">&copy; 2026 Flowbase Inc.</div>
</footer>
`.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // EVENT
  // ═══════════════════════════════════════════════════════════
  {
    id: "event-conference",
    name: "Conference 2026",
    category: "event",
    description:
      "Full conference page: hero, highlights, speakers, schedule, tickets, sponsors, venue, footer",
    tags: ["event", "conference", "meetup", "webinar", "tickets"],
    sections: 9,
    css: baseCss(),
    html: `
<nav style="padding:14px 24px;background:#1e1b4b;color:#fff">
  <div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:16px">
    <div style="font-size:1.2rem;font-weight:800">TechConf 2026</div>
    <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;font-size:0.9rem">
      <a href="#speakers" style="color:#c4b5fd;text-decoration:none;font-weight:500">Speakers</a>
      <a href="#schedule" style="color:#c4b5fd;text-decoration:none;font-weight:500">Schedule</a>
      <a href="#tickets" style="color:#c4b5fd;text-decoration:none;font-weight:500">Tickets</a>
      <a href="#tickets" style="padding:9px 18px;background:#f59e0b;color:#1e1b4b;border-radius:8px;text-decoration:none;font-weight:800">Get tickets</a>
    </div>
  </div>
</nav>

<section style="padding:100px 24px;background:linear-gradient(145deg,#1e1b4b,#312e81 50%,#4c1d95);color:#fff;text-align:center">
  <div style="max-width:720px;margin:0 auto">
    <span style="display:inline-block;padding:6px 16px;background:rgba(255,255,255,0.12);border-radius:999px;font-size:0.9rem;margin-bottom:18px">📅 October 15–17, 2026 · San Francisco</span>
    <h1 style="font-size:3.75rem;font-weight:900;margin:0 0 1rem;line-height:1.08;letter-spacing:-0.03em">TechConf 2026</h1>
    <p style="font-size:1.25rem;opacity:0.88;margin:0 0 2rem;line-height:1.65">Three days of talks, workshops, and networking with the builders shaping the next decade of software.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="#tickets" style="padding:14px 32px;background:#f59e0b;color:#1e1b4b;border-radius:10px;text-decoration:none;font-weight:800">Get your ticket</a>
      <a href="#speakers" style="padding:12px 28px;border:2px solid rgba(255,255,255,0.3);color:#fff;border-radius:10px;text-decoration:none;font-weight:600">See speakers</a>
    </div>
  </div>
</section>

<section style="padding:48px 24px;background:#0f172a;color:#e2e8f0">
  <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;text-align:center">
    <div><div style="font-size:1.75rem;font-weight:800;color:#fbbf24">3</div><div style="opacity:0.75;font-size:0.9rem;margin-top:4px">Days</div></div>
    <div><div style="font-size:1.75rem;font-weight:800;color:#fbbf24">80+</div><div style="opacity:0.75;font-size:0.9rem;margin-top:4px">Speakers</div></div>
    <div><div style="font-size:1.75rem;font-weight:800;color:#fbbf24">2,500</div><div style="opacity:0.75;font-size:0.9rem;margin-top:4px">Attendees</div></div>
    <div><div style="font-size:1.75rem;font-weight:800;color:#fbbf24">12</div><div style="opacity:0.75;font-size:0.9rem;margin-top:4px">Workshops</div></div>
  </div>
</section>

<section id="speakers" style="padding:88px 24px;background:#fff">
  <div style="max-width:1000px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:800;margin:0 0 36px;color:#0f172a">Featured speakers</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
      <div style="text-align:center"><div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);margin:0 auto 12px"></div><h4 style="font-weight:700;margin:0 0 4px">Dr. Sarah Chen</h4><p style="color:#64748b;font-size:0.85rem;margin:0">AI Research, Google</p></div>
      <div style="text-align:center"><div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#2563eb);margin:0 auto 12px"></div><h4 style="font-weight:700;margin:0 0 4px">Mark Rivera</h4><p style="color:#64748b;font-size:0.85rem;margin:0">CTO, Stripe</p></div>
      <div style="text-align:center"><div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#ef4444);margin:0 auto 12px"></div><h4 style="font-weight:700;margin:0 0 4px">Aisha Patel</h4><p style="color:#64748b;font-size:0.85rem;margin:0">VP Eng, Notion</p></div>
      <div style="text-align:center"><div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#10b981,#14b8a6);margin:0 auto 12px"></div><h4 style="font-weight:700;margin:0 0 4px">James Park</h4><p style="color:#64748b;font-size:0.85rem;margin:0">Founder, Linear</p></div>
    </div>
  </div>
</section>

<section id="schedule" style="padding:88px 24px;background:#f8fafc">
  <div style="max-width:800px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:800;margin:0 0 36px">Schedule highlights</h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:grid;grid-template-columns:100px 1fr;gap:16px;padding:18px 20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;align-items:center">
        <div style="font-weight:800;color:#4f46e5">Day 1</div>
        <div><div style="font-weight:700">Keynotes & AI track</div><div style="color:#64748b;font-size:0.9rem;margin-top:2px">Opening ceremony · Future of AI systems · Expo hall opens</div></div>
      </div>
      <div style="display:grid;grid-template-columns:100px 1fr;gap:16px;padding:18px 20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;align-items:center">
        <div style="font-weight:800;color:#4f46e5">Day 2</div>
        <div><div style="font-weight:700">Workshops & deep dives</div><div style="color:#64748b;font-size:0.9rem;margin-top:2px">Hands-on labs · Platform engineering · Product design</div></div>
      </div>
      <div style="display:grid;grid-template-columns:100px 1fr;gap:16px;padding:18px 20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;align-items:center">
        <div style="font-weight:800;color:#4f46e5">Day 3</div>
        <div><div style="font-weight:700">Startups & networking</div><div style="color:#64748b;font-size:0.9rem;margin-top:2px">Pitch stage · Founder circles · Closing party</div></div>
      </div>
    </div>
  </div>
</section>

<section id="tickets" style="padding:88px 24px;background:#fff;text-align:center">
  <div style="max-width:900px;margin:0 auto">
    <h2 style="font-size:2rem;font-weight:800;margin:0 0 12px">Tickets</h2>
    <p style="color:#64748b;margin:0 0 36px">Early bird pricing ends September 1st</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:left">
      <div style="padding:28px;border:1px solid #e2e8f0;border-radius:16px">
        <div style="font-weight:700;margin-bottom:8px">General</div>
        <div style="font-size:2.25rem;font-weight:900;color:#1e1b4b">$299</div>
        <div style="color:#94a3b8;text-decoration:line-through;font-size:0.9rem;margin-bottom:16px">$499</div>
        <ul style="color:#64748b;line-height:2;margin:0 0 20px;padding:0;font-size:0.9rem"><li>✓ All talks</li><li>✓ Expo access</li><li>✓ Lunch daily</li></ul>
        <a href="#" style="display:block;text-align:center;padding:12px;background:#1e1b4b;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Buy general</a>
      </div>
      <div style="padding:28px;border:2px solid #f59e0b;border-radius:16px;background:#fffbeb;position:relative">
        <span style="position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:#f59e0b;color:#1e1b4b;font-size:0.7rem;font-weight:800;padding:4px 12px;border-radius:999px">Best value</span>
        <div style="font-weight:700;margin:4px 0 8px">VIP</div>
        <div style="font-size:2.25rem;font-weight:900;color:#1e1b4b">$599</div>
        <div style="color:#94a3b8;font-size:0.9rem;margin-bottom:16px">All-access</div>
        <ul style="color:#64748b;line-height:2;margin:0 0 20px;padding:0;font-size:0.9rem"><li>✓ Everything in General</li><li>✓ Workshops</li><li>✓ VIP lounge</li><li>✓ Speaker dinner</li></ul>
        <a href="#" style="display:block;text-align:center;padding:12px;background:#f59e0b;color:#1e1b4b;border-radius:10px;text-decoration:none;font-weight:800">Buy VIP</a>
      </div>
      <div style="padding:28px;border:1px solid #e2e8f0;border-radius:16px">
        <div style="font-weight:700;margin-bottom:8px">Virtual</div>
        <div style="font-size:2.25rem;font-weight:900;color:#1e1b4b">$99</div>
        <div style="color:#94a3b8;font-size:0.9rem;margin-bottom:16px">Live stream</div>
        <ul style="color:#64748b;line-height:2;margin:0 0 20px;padding:0;font-size:0.9rem"><li>✓ Live keynotes</li><li>✓ On-demand 30 days</li><li>✓ Slack community</li></ul>
        <a href="#" style="display:block;text-align:center;padding:12px;background:#1e1b4b;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Buy virtual</a>
      </div>
    </div>
  </div>
</section>

<section style="padding:64px 24px;background:#0f172a;color:#e2e8f0;text-align:center">
  <div style="max-width:800px;margin:0 auto">
    <p style="font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;margin:0 0 24px">Sponsors</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:36px;font-weight:800;opacity:0.7;font-size:1.1rem">
      <span>CloudNine</span><span>DevStack</span><span>PixelOps</span><span>NexusAI</span><span>Orbit</span>
    </div>
  </div>
</section>

<section style="padding:72px 24px;background:#f8fafc">
  <div style="max-width:800px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center">
    <div>
      <h2 style="font-size:1.75rem;font-weight:800;margin:0 0 12px">Venue</h2>
      <p style="color:#64748b;line-height:1.7;margin:0 0 8px"><strong style="color:#0f172a">Moscone Center</strong><br/>747 Howard St<br/>San Francisco, CA 94103</p>
      <p style="color:#64748b;margin:0;font-size:0.95rem">Hotels and transit guides available after registration.</p>
    </div>
    <div style="min-height:200px;border-radius:16px;background:linear-gradient(135deg,#c7d2fe,#a5b4fc)"></div>
  </div>
</section>

<footer style="background:#1e1b4b;color:#c4b5fd;padding:40px 24px;text-align:center">
  <div style="font-weight:800;color:#fff;margin-bottom:8px">TechConf 2026</div>
  <p style="margin:0 0 16px;font-size:0.9rem;opacity:0.85">Questions? hello@techconf.example</p>
  <div style="font-size:0.85rem;opacity:0.7">&copy; 2026 TechConf · Code of conduct · Privacy</div>
</footer>
`.trim(),
  },
];
