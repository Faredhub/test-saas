import { baseCss, type WebsiteTemplate } from "./types";

/**
 * Full multi-section homepage designs for GrapesJS.
 * Each template is a complete, editable page (nav → footer).
 */

export const websiteTemplatesPartA: WebsiteTemplate[] = [
  // ═══════════════════════════════════════════════════════════
  // BUSINESS
  // ═══════════════════════════════════════════════════════════
  {
    id: "business-pro",
    name: "Business Pro",
    category: "business",
    description:
      "Full corporate homepage: nav, hero, logos, services, about, stats, team, testimonials, CTA, and footer",
    tags: ["corporate", "agency", "consulting", "saas"],
    sections: 10,
    css: baseCss(),
    html: `
<nav style="position:sticky;top:0;z-index:50;padding:14px 24px;background:rgba(255,255,255,0.92);border-bottom:1px solid #e2e8f0;backdrop-filter:blur(10px)">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:24px">
    <div style="font-size:1.35rem;font-weight:800;letter-spacing:-0.02em;color:#0f172a">AcmeCorp</div>
    <div style="display:flex;gap:28px;align-items:center;flex-wrap:wrap">
      <a href="#services" style="color:#64748b;text-decoration:none;font-weight:500;font-size:0.95rem">Services</a>
      <a href="#about" style="color:#64748b;text-decoration:none;font-weight:500;font-size:0.95rem">About</a>
      <a href="#team" style="color:#64748b;text-decoration:none;font-weight:500;font-size:0.95rem">Team</a>
      <a href="#contact" style="color:#64748b;text-decoration:none;font-weight:500;font-size:0.95rem">Contact</a>
      <a href="#contact" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:0.9rem;box-shadow:0 4px 14px rgba(79,70,229,0.3)">Get Started</a>
    </div>
  </div>
</nav>

<section style="padding:96px 24px 88px;background:radial-gradient(ellipse 80% 60% at 50% -10%,#e0e7ff 0%,#ffffff 55%);text-align:center">
  <div style="max-width:820px;margin:0 auto">
    <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px;background:#eef2ff;color:#4f46e5;border-radius:999px;font-size:0.8rem;font-weight:600;margin-bottom:22px">Trusted by 2,400+ growing teams</span>
    <h1 style="font-size:3.5rem;font-weight:800;line-height:1.1;letter-spacing:-0.03em;color:#0f172a;margin:0 0 1.25rem">Grow your business with confidence</h1>
    <p style="font-size:1.2rem;color:#64748b;line-height:1.7;margin:0 0 2rem;max-width:600px;margin-left:auto;margin-right:auto">All-in-one operations, sales, and customer success — designed for modern companies that move fast.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="#contact" style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;box-shadow:0 8px 24px rgba(79,70,229,0.35)">Start free trial</a>
      <a href="#services" style="display:inline-block;padding:12px 26px;background:#fff;color:#334155;border:1px solid #e2e8f0;border-radius:12px;text-decoration:none;font-weight:600">Explore services</a>
    </div>
  </div>
</section>

<section style="padding:40px 24px;border-bottom:1px solid #f1f5f9;background:#fff">
  <div style="max-width:1000px;margin:0 auto;text-align:center">
    <p style="font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;margin:0 0 20px">Used by teams at</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:36px;align-items:center;opacity:0.65">
      <span style="font-weight:800;font-size:1.1rem;color:#64748b">NORTHWIND</span>
      <span style="font-weight:800;font-size:1.1rem;color:#64748b">GLOBEX</span>
      <span style="font-weight:800;font-size:1.1rem;color:#64748b">INITECH</span>
      <span style="font-weight:800;font-size:1.1rem;color:#64748b">UMBRELLA</span>
      <span style="font-weight:800;font-size:1.1rem;color:#64748b">STARK</span>
    </div>
  </div>
</section>

<section id="services" style="padding:96px 24px;background:#f8fafc">
  <div style="max-width:1200px;margin:0 auto">
    <div style="text-align:center;max-width:560px;margin:0 auto 48px">
      <div style="display:inline-block;padding:5px 12px;background:#eef2ff;color:#4f46e5;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:12px">SERVICES</div>
      <h2 style="font-size:2.25rem;font-weight:800;letter-spacing:-0.02em;color:#0f172a;margin:0 0 0.75rem">Everything your business needs</h2>
      <p style="color:#64748b;margin:0;line-height:1.7">From strategy to execution — modular services that scale with you.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
      <div style="background:#fff;padding:28px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(15,23,42,0.04)">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.25rem;margin-bottom:16px">◆</div>
        <h3 style="font-size:1.15rem;font-weight:700;margin:0 0 0.5rem;color:#0f172a">Strategy consulting</h3>
        <p style="color:#64748b;line-height:1.65;margin:0;font-size:0.95rem">Market positioning, growth planning, and operational roadmaps tailored to your stage.</p>
      </div>
      <div style="background:#fff;padding:28px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(15,23,42,0.04)">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#0ea5e9,#2563eb);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.25rem;margin-bottom:16px">◇</div>
        <h3 style="font-size:1.15rem;font-weight:700;margin:0 0 0.5rem;color:#0f172a">Product development</h3>
        <p style="color:#64748b;line-height:1.65;margin:0;font-size:0.95rem">Custom software, integrations, and digital products built for reliability and scale.</p>
      </div>
      <div style="background:#fff;padding:28px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(15,23,42,0.04)">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.25rem;margin-bottom:16px">○</div>
        <h3 style="font-size:1.15rem;font-weight:700;margin:0 0 0.5rem;color:#0f172a">Ongoing support</h3>
        <p style="color:#64748b;line-height:1.65;margin:0;font-size:0.95rem">24/7 monitoring, dedicated success managers, and continuous improvement cycles.</p>
      </div>
    </div>
  </div>
</section>

<section id="about" style="padding:0;background:#fff">
  <div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;min-height:420px">
    <div style="padding:80px 48px;display:flex;flex-direction:column;justify-content:center">
      <div style="display:inline-block;padding:5px 12px;background:#eef2ff;color:#4f46e5;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:16px;width:fit-content">ABOUT US</div>
      <h2 style="font-size:2.1rem;font-weight:800;letter-spacing:-0.02em;color:#0f172a;margin:0 0 1rem">A partner that thinks like an owner</h2>
      <p style="color:#64748b;line-height:1.75;margin:0 0 1.25rem">We combine strategy, design, and engineering to help companies launch faster and operate leaner. Our team has shipped products for startups and enterprises across 12 industries.</p>
      <ul style="margin:0;padding:0;display:flex;flex-direction:column;gap:10px;color:#334155">
        <li style="display:flex;gap:10px"><span style="color:#22c55e;font-weight:700">✓</span> Outcome-based engagements</li>
        <li style="display:flex;gap:10px"><span style="color:#22c55e;font-weight:700">✓</span> Cross-functional pods</li>
        <li style="display:flex;gap:10px"><span style="color:#22c55e;font-weight:700">✓</span> Transparent weekly reporting</li>
      </ul>
    </div>
    <div style="background:linear-gradient(145deg,#312e81 0%,#4f46e5 50%,#7c3aed 100%);min-height:320px"></div>
  </div>
</section>

<section style="padding:72px 24px;background:#0f172a;color:#f8fafc">
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:32px;text-align:center">
    <div><div style="font-size:2.5rem;font-weight:800;color:#a5b4fc">12+</div><div style="color:#94a3b8;margin-top:6px;font-size:0.95rem">Years experience</div></div>
    <div><div style="font-size:2.5rem;font-weight:800;color:#a5b4fc">340</div><div style="color:#94a3b8;margin-top:6px;font-size:0.95rem">Projects delivered</div></div>
    <div><div style="font-size:2.5rem;font-weight:800;color:#a5b4fc">98%</div><div style="color:#94a3b8;margin-top:6px;font-size:0.95rem">Client retention</div></div>
    <div><div style="font-size:2.5rem;font-weight:800;color:#a5b4fc">24/7</div><div style="color:#94a3b8;margin-top:6px;font-size:0.95rem">Support coverage</div></div>
  </div>
</section>

<section id="team" style="padding:96px 24px;background:#fff">
  <div style="max-width:1100px;margin:0 auto">
    <div style="text-align:center;margin-bottom:48px">
      <h2 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin:0 0 0.75rem">Meet the leadership</h2>
      <p style="color:#64748b;margin:0">Operators, builders, and designers who ship.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
      <div style="text-align:center;padding:24px 16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc">
        <div style="width:72px;height:72px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(135deg,#6366f1,#8b5cf6)"></div>
        <div style="font-weight:700;color:#0f172a">Alex Morgan</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:4px">CEO & Founder</div>
      </div>
      <div style="text-align:center;padding:24px 16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc">
        <div style="width:72px;height:72px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(135deg,#06b6d4,#3b82f6)"></div>
        <div style="font-weight:700;color:#0f172a">Sam Rivera</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:4px">Head of Design</div>
      </div>
      <div style="text-align:center;padding:24px 16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc">
        <div style="width:72px;height:72px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(135deg,#f59e0b,#ef4444)"></div>
        <div style="font-weight:700;color:#0f172a">Jamie Park</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:4px">VP Engineering</div>
      </div>
      <div style="text-align:center;padding:24px 16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc">
        <div style="width:72px;height:72px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(135deg,#10b981,#14b8a6)"></div>
        <div style="font-weight:700;color:#0f172a">Riley Quinn</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:4px">Client Success</div>
      </div>
    </div>
  </div>
</section>

<section style="padding:96px 24px;background:#f8fafc">
  <div style="max-width:720px;margin:0 auto;text-align:center">
    <div style="color:#f59e0b;font-size:1.25rem;letter-spacing:2px;margin-bottom:16px">★★★★★</div>
    <p style="font-size:1.35rem;line-height:1.7;color:#1e293b;font-style:italic;margin:0 0 1.75rem">"AcmeCorp rebuilt our entire customer ops stack in eight weeks. Revenue-facing teams finally have one source of truth."</p>
    <div style="font-weight:700;color:#0f172a">Jordan Lee</div>
    <div style="color:#64748b;font-size:0.9rem">COO, Studio North</div>
  </div>
</section>

<section id="contact" style="padding:80px 24px">
  <div style="max-width:1000px;margin:0 auto;padding:56px 40px;text-align:center;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:24px;box-shadow:0 20px 40px rgba(79,70,229,0.25)">
    <h2 style="font-size:2.1rem;font-weight:800;margin:0 0 0.75rem;letter-spacing:-0.02em">Ready to scale with a real partner?</h2>
    <p style="opacity:0.9;margin:0 0 1.75rem;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.65">Book a discovery call — we'll map opportunities and a 90-day plan, free.</p>
    <a href="#" style="display:inline-block;padding:14px 32px;background:#fff;color:#4f46e5;border-radius:12px;text-decoration:none;font-weight:700">Book a free consult</a>
  </div>
</section>

<footer style="background:#0f172a;color:#f8fafc;padding:64px 24px 28px">
  <div style="max-width:1200px;margin:0 auto">
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:36px">
      <div>
        <div style="font-size:1.2rem;font-weight:800;margin-bottom:12px">AcmeCorp</div>
        <p style="color:#94a3b8;line-height:1.7;margin:0;max-width:280px">Strategy, product, and support for ambitious companies.</p>
      </div>
      <div>
        <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#cbd5e1;margin-bottom:12px">Product</div>
        <ul style="color:#94a3b8;line-height:2.1;margin:0;padding:0"><li>Services</li><li>Pricing</li><li>Case studies</li></ul>
      </div>
      <div>
        <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#cbd5e1;margin-bottom:12px">Company</div>
        <ul style="color:#94a3b8;line-height:2.1;margin:0;padding:0"><li>About</li><li>Careers</li><li>Blog</li></ul>
      </div>
      <div>
        <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#cbd5e1;margin-bottom:12px">Legal</div>
        <ul style="color:#94a3b8;line-height:2.1;margin:0;padding:0"><li>Privacy</li><li>Terms</li><li>Security</li></ul>
      </div>
    </div>
    <div style="border-top:1px solid #1e293b;margin-top:40px;padding-top:20px;color:#64748b;font-size:0.875rem;text-align:center">&copy; 2026 AcmeCorp. All rights reserved.</div>
  </div>
</footer>
`.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // RESTAURANT
  // ═══════════════════════════════════════════════════════════
  {
    id: "restaurant-elegant",
    name: "Restaurant Elegant",
    category: "restaurant",
    description:
      "Full restaurant site: nav, hero, story, menu, gallery, reservations, hours, and footer",
    tags: ["restaurant", "cafe", "food", "dining", "bistro"],
    sections: 9,
    css: baseCss({
      font: "Georgia, 'Times New Roman', serif",
      color: "#1a1a2e",
      bg: "#faf9f7",
    }),
    html: `
<nav style="padding:16px 24px;background:#1a1a2e;color:#fff">
  <div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:20px">
    <div style="font-size:1.5rem;font-weight:700;letter-spacing:0.04em">La Maison</div>
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
      <a href="#menu" style="color:#ccc;text-decoration:none;font-weight:500;font-family:-apple-system,sans-serif;font-size:0.9rem">Menu</a>
      <a href="#story" style="color:#ccc;text-decoration:none;font-weight:500;font-family:-apple-system,sans-serif;font-size:0.9rem">Our Story</a>
      <a href="#gallery" style="color:#ccc;text-decoration:none;font-weight:500;font-family:-apple-system,sans-serif;font-size:0.9rem">Gallery</a>
      <a href="#reserve" style="color:#ccc;text-decoration:none;font-weight:500;font-family:-apple-system,sans-serif;font-size:0.9rem">Contact</a>
      <a href="#reserve" style="padding:9px 18px;background:#c9a96e;color:#1a1a2e;border-radius:6px;text-decoration:none;font-weight:700;font-family:-apple-system,sans-serif;font-size:0.9rem">Book a Table</a>
    </div>
  </div>
</nav>

<section style="padding:140px 24px;background:linear-gradient(rgba(26,26,46,0.72),rgba(26,26,46,0.72)),url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600');background-size:cover;background-position:center;color:#fff;text-align:center">
  <div style="max-width:720px;margin:0 auto">
    <p style="font-family:-apple-system,sans-serif;letter-spacing:0.2em;text-transform:uppercase;font-size:0.8rem;opacity:0.85;margin:0 0 16px">Est. 1998 · Fine Dining</p>
    <h1 style="font-size:4rem;font-weight:400;margin:0 0 1rem;line-height:1.15">A table worth dressing up for</h1>
    <p style="font-size:1.15rem;opacity:0.9;margin:0 0 2rem;font-family:-apple-system,sans-serif;line-height:1.7">Seasonal tasting menus, cellar wines, and hospitality that feels personal.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="#menu" style="display:inline-block;padding:14px 32px;background:#c9a96e;color:#1a1a2e;border-radius:8px;text-decoration:none;font-weight:700;font-family:-apple-system,sans-serif">View menu</a>
      <a href="#reserve" style="display:inline-block;padding:12px 28px;border:1px solid rgba(255,255,255,0.45);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-family:-apple-system,sans-serif">Reserve</a>
    </div>
  </div>
</section>

<section id="story" style="padding:96px 24px;background:#faf9f7">
  <div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center">
    <div style="min-height:320px;border-radius:12px;background:linear-gradient(135deg,#d4c4a8,#e5e0d8)"></div>
    <div>
      <h2 style="font-size:2.25rem;font-weight:400;margin:0 0 1rem">Our story</h2>
      <p style="font-family:-apple-system,sans-serif;color:#57534e;line-height:1.8;margin:0 0 1rem">La Maison began as a family kitchen and grew into a neighborhood institution. We source from local farms and coastal fisheries, crafting plates that balance classic technique with modern restraint.</p>
      <p style="font-family:-apple-system,sans-serif;color:#57534e;line-height:1.8;margin:0">Chef Elise Moreau leads a team of fifteen, united by one rule: every guest should leave planning their next visit.</p>
    </div>
  </div>
</section>

<section id="menu" style="padding:96px 24px;background:#fff">
  <div style="max-width:1000px;margin:0 auto">
    <h2 style="text-align:center;font-size:2.25rem;font-weight:400;margin:0 0 12px">Signature menu</h2>
    <p style="text-align:center;font-family:-apple-system,sans-serif;color:#78716c;margin:0 0 48px">A selection from this season's tasting menu</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px">
      <div style="text-align:center">
        <div style="height:200px;border-radius:10px;background:linear-gradient(135deg,#c4b5a0,#e7e0d5);margin-bottom:16px"></div>
        <h4 style="font-weight:600;margin:0 0 6px;font-family:-apple-system,sans-serif">Grilled Salmon</h4>
        <p style="font-family:-apple-system,sans-serif;color:#78716c;font-size:0.9rem;margin:0 0 8px;line-height:1.5">Citrus beurre blanc, fennel, dill oil</p>
        <p style="font-family:-apple-system,sans-serif;font-weight:700;color:#c9a96e;margin:0">$28</p>
      </div>
      <div style="text-align:center">
        <div style="height:200px;border-radius:10px;background:linear-gradient(135deg,#a89f91,#d6cfc4);margin-bottom:16px"></div>
        <h4 style="font-weight:600;margin:0 0 6px;font-family:-apple-system,sans-serif">Beef Wellington</h4>
        <p style="font-family:-apple-system,sans-serif;color:#78716c;font-size:0.9rem;margin:0 0 8px;line-height:1.5">Truffle duxelles, red wine jus</p>
        <p style="font-family:-apple-system,sans-serif;font-weight:700;color:#c9a96e;margin:0">$42</p>
      </div>
      <div style="text-align:center">
        <div style="height:200px;border-radius:10px;background:linear-gradient(135deg,#b7a99a,#ebe4da);margin-bottom:16px"></div>
        <h4 style="font-weight:600;margin:0 0 6px;font-family:-apple-system,sans-serif">Tiramisu</h4>
        <p style="font-family:-apple-system,sans-serif;color:#78716c;font-size:0.9rem;margin:0 0 8px;line-height:1.5">Espresso, mascarpone, cacao</p>
        <p style="font-family:-apple-system,sans-serif;font-weight:700;color:#c9a96e;margin:0">$14</p>
      </div>
    </div>
    <div style="margin-top:48px;border-top:1px solid #e7e5e4;padding-top:32px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 48px;font-family:-apple-system,sans-serif;max-width:700px;margin:0 auto">
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed #e7e5e4"><span>Oysters Rockefeller</span><span style="color:#c9a96e;font-weight:600">$18</span></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed #e7e5e4"><span>Duck confit</span><span style="color:#c9a96e;font-weight:600">$36</span></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed #e7e5e4"><span>Heirloom tomato salad</span><span style="color:#c9a96e;font-weight:600">$16</span></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed #e7e5e4"><span>Chocolate soufflé</span><span style="color:#c9a96e;font-weight:600">$15</span></div>
      </div>
    </div>
  </div>
</section>

<section id="gallery" style="padding:80px 24px;background:#1a1a2e">
  <div style="max-width:1100px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:400;color:#fff;margin:0 0 36px">Gallery</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
      <div style="aspect-ratio:1;border-radius:8px;background:linear-gradient(135deg,#3d3a5c,#5c5678)"></div>
      <div style="aspect-ratio:1;border-radius:8px;background:linear-gradient(135deg,#4a3f35,#7a6a58)"></div>
      <div style="aspect-ratio:1;border-radius:8px;background:linear-gradient(135deg,#2d3a45,#4a6070)"></div>
      <div style="aspect-ratio:1;border-radius:8px;background:linear-gradient(135deg,#3a2f2f,#6b5050)"></div>
    </div>
  </div>
</section>

<section id="reserve" style="padding:96px 24px;background:#faf9f7">
  <div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start">
    <div>
      <h2 style="font-size:2rem;font-weight:400;margin:0 0 1rem">Reserve a table</h2>
      <p style="font-family:-apple-system,sans-serif;color:#57534e;line-height:1.7;margin:0 0 1.5rem">Call us at <strong>(555) 123-4567</strong> or request a reservation online. We hold tables for parties of 2–12.</p>
      <div style="font-family:-apple-system,sans-serif;display:flex;flex-direction:column;gap:10px;color:#44403c">
        <div><strong>Tue – Thu</strong> · 5:00pm – 10:00pm</div>
        <div><strong>Fri – Sat</strong> · 5:00pm – 11:00pm</div>
        <div><strong>Sunday</strong> · 4:00pm – 9:00pm</div>
        <div style="color:#78716c;margin-top:8px">Closed Mondays</div>
      </div>
    </div>
    <form style="background:#fff;padding:28px;border-radius:12px;border:1px solid #e7e5e4;display:flex;flex-direction:column;gap:12px;font-family:-apple-system,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.04)">
      <input placeholder="Full name" style="padding:12px 14px;border:1px solid #e7e5e4;border-radius:8px;width:100%" />
      <input type="email" placeholder="Email" style="padding:12px 14px;border:1px solid #e7e5e4;border-radius:8px;width:100%" />
      <input type="tel" placeholder="Phone" style="padding:12px 14px;border:1px solid #e7e5e4;border-radius:8px;width:100%" />
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <input type="date" style="padding:12px 14px;border:1px solid #e7e5e4;border-radius:8px;width:100%" />
        <input type="time" style="padding:12px 14px;border:1px solid #e7e5e4;border-radius:8px;width:100%" />
      </div>
      <select style="padding:12px 14px;border:1px solid #e7e5e4;border-radius:8px;width:100%;background:#fff"><option>2 guests</option><option>4 guests</option><option>6 guests</option><option>8+ guests</option></select>
      <button type="submit" style="padding:14px;background:#c9a96e;color:#1a1a2e;border:none;border-radius:8px;font-weight:700;cursor:pointer;margin-top:4px">Request reservation</button>
    </form>
  </div>
</section>

<footer style="background:#1a1a2e;color:#fff;padding:48px 24px 24px;text-align:center">
  <div style="font-size:1.35rem;font-weight:700;margin-bottom:12px">La Maison</div>
  <p style="font-family:-apple-system,sans-serif;color:#a8a29e;margin:0 0 8px">124 Oak Street · Downtown · (555) 123-4567</p>
  <p style="font-family:-apple-system,sans-serif;color:#78716c;font-size:0.85rem;margin:24px 0 0">&copy; 2026 La Maison. All rights reserved.</p>
</footer>
`.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // REAL ESTATE
  // ═══════════════════════════════════════════════════════════
  {
    id: "realestate-modern",
    name: "Real Estate Modern",
    category: "realestate",
    description:
      "Full property site: nav, search hero, featured listings, neighborhoods, agents, process, CTA, footer",
    tags: ["realestate", "property", "broker", "agency"],
    sections: 9,
    css: baseCss({ color: "#0f172a" }),
    html: `
<nav style="padding:14px 24px;background:#fff;border-bottom:1px solid #e2e8f0">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:20px">
    <div style="font-size:1.4rem;font-weight:800;color:#0f766e">HomeFinders</div>
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
      <a href="#listings" style="color:#64748b;text-decoration:none;font-weight:500">Buy</a>
      <a href="#listings" style="color:#64748b;text-decoration:none;font-weight:500">Rent</a>
      <a href="#areas" style="color:#64748b;text-decoration:none;font-weight:500">Neighborhoods</a>
      <a href="#agents" style="color:#64748b;text-decoration:none;font-weight:500">Agents</a>
      <a href="#contact" style="padding:10px 18px;background:#0f766e;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Contact</a>
    </div>
  </div>
</nav>

<section style="padding:88px 24px;background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;text-align:center">
  <div style="max-width:720px;margin:0 auto">
    <h1 style="font-size:3.1rem;font-weight:800;letter-spacing:-0.03em;margin:0 0 1rem;line-height:1.15">Find a home that fits your life</h1>
    <p style="font-size:1.15rem;opacity:0.92;margin:0 0 1.75rem;line-height:1.65">Search thousands of listings with local agents who know every street.</p>
    <div style="display:flex;gap:0;max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.15)">
      <input placeholder="City, neighborhood, or ZIP" style="flex:1;padding:16px 18px;border:none;font-size:1rem;outline:none;color:#0f172a;min-width:0" />
      <button style="padding:16px 24px;background:#0f766e;color:#fff;border:none;font-weight:700;cursor:pointer;white-space:nowrap">Search</button>
    </div>
    <div style="display:flex;gap:20px;justify-content:center;margin-top:20px;flex-wrap:wrap;font-size:0.9rem;opacity:0.9">
      <span>3,200+ active listings</span>
      <span>·</span>
      <span>Avg. 18 days to close</span>
      <span>·</span>
      <span>Top-rated agents</span>
    </div>
  </div>
</section>

<section id="listings" style="padding:88px 24px;background:#f8fafc">
  <div style="max-width:1200px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:end;margin-bottom:32px;gap:16px;flex-wrap:wrap">
      <div>
        <h2 style="font-size:2rem;font-weight:800;margin:0 0 0.4rem;color:#0f172a">Featured properties</h2>
        <p style="color:#64748b;margin:0">Hand-picked homes available this week</p>
      </div>
      <a href="#" style="color:#0f766e;font-weight:600;text-decoration:none">View all listings →</a>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,0.04)">
        <div style="height:200px;background:linear-gradient(135deg,#99f6e4,#5eead4)"></div>
        <div style="padding:18px">
          <div style="font-size:1.25rem;font-weight:800;color:#0f172a;margin-bottom:4px">$450,000</div>
          <div style="color:#64748b;font-size:0.9rem;margin-bottom:8px">3 bd · 2 ba · 1,800 sqft</div>
          <div style="color:#475569;font-size:0.9rem">123 Main St, Austin TX</div>
          <span style="display:inline-block;margin-top:12px;padding:4px 10px;background:#ecfdf5;color:#0f766e;border-radius:999px;font-size:0.75rem;font-weight:600">Open house Sat</span>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,0.04)">
        <div style="height:200px;background:linear-gradient(135deg,#a5f3fc,#67e8f9)"></div>
        <div style="padding:18px">
          <div style="font-size:1.25rem;font-weight:800;color:#0f172a;margin-bottom:4px">$620,000</div>
          <div style="color:#64748b;font-size:0.9rem;margin-bottom:8px">4 bd · 3 ba · 2,400 sqft</div>
          <div style="color:#475569;font-size:0.9rem">456 Oak Ave, Dallas TX</div>
          <span style="display:inline-block;margin-top:12px;padding:4px 10px;background:#eef2ff;color:#4f46e5;border-radius:999px;font-size:0.75rem;font-weight:600">New listing</span>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,0.04)">
        <div style="height:200px;background:linear-gradient(135deg,#bbf7d0,#86efac)"></div>
        <div style="padding:18px">
          <div style="font-size:1.25rem;font-weight:800;color:#0f172a;margin-bottom:4px">$380,000</div>
          <div style="color:#64748b;font-size:0.9rem;margin-bottom:8px">2 bd · 2 ba · 1,200 sqft</div>
          <div style="color:#475569;font-size:0.9rem">789 Pine Rd, Houston TX</div>
          <span style="display:inline-block;margin-top:12px;padding:4px 10px;background:#fff7ed;color:#ea580c;border-radius:999px;font-size:0.75rem;font-weight:600">Price drop</span>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="areas" style="padding:88px 24px;background:#fff">
  <div style="max-width:1100px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:800;margin:0 0 40px;color:#0f172a">Popular neighborhoods</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
      <div style="border-radius:14px;overflow:hidden;position:relative;min-height:180px;background:linear-gradient(160deg,#0f766e,#134e4a);color:#fff;padding:20px;display:flex;flex-direction:column;justify-content:flex-end">
        <div style="font-weight:700;font-size:1.1rem">Downtown</div>
        <div style="opacity:0.85;font-size:0.85rem">214 homes</div>
      </div>
      <div style="border-radius:14px;overflow:hidden;min-height:180px;background:linear-gradient(160deg,#0d9488,#115e59);color:#fff;padding:20px;display:flex;flex-direction:column;justify-content:flex-end">
        <div style="font-weight:700;font-size:1.1rem">Lakeview</div>
        <div style="opacity:0.85;font-size:0.85rem">98 homes</div>
      </div>
      <div style="border-radius:14px;overflow:hidden;min-height:180px;background:linear-gradient(160deg,#14b8a6,#0f766e);color:#fff;padding:20px;display:flex;flex-direction:column;justify-content:flex-end">
        <div style="font-weight:700;font-size:1.1rem">Westside</div>
        <div style="opacity:0.85;font-size:0.85rem">156 homes</div>
      </div>
      <div style="border-radius:14px;overflow:hidden;min-height:180px;background:linear-gradient(160deg,#2dd4bf,#0f766e);color:#fff;padding:20px;display:flex;flex-direction:column;justify-content:flex-end">
        <div style="font-weight:700;font-size:1.1rem">Hillcrest</div>
        <div style="opacity:0.85;font-size:0.85rem">72 homes</div>
      </div>
    </div>
  </div>
</section>

<section style="padding:80px 24px;background:#f0fdfa">
  <div style="max-width:1000px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:800;margin:0 0 40px;color:#0f172a">How it works</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px">
      <div style="text-align:center;padding:8px">
        <div style="width:48px;height:48px;border-radius:50%;background:#0f766e;color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-weight:800">1</div>
        <h3 style="font-weight:700;margin:0 0 8px">Tell us what you need</h3>
        <p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Budget, neighborhood, must-haves — we match you with the right agent.</p>
      </div>
      <div style="text-align:center;padding:8px">
        <div style="width:48px;height:48px;border-radius:50%;background:#0f766e;color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-weight:800">2</div>
        <h3 style="font-weight:700;margin:0 0 8px">Tour & shortlist</h3>
        <p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Private showings and virtual tours until you find the one.</p>
      </div>
      <div style="text-align:center;padding:8px">
        <div style="width:48px;height:48px;border-radius:50%;background:#0f766e;color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-weight:800">3</div>
        <h3 style="font-weight:700;margin:0 0 8px">Offer to keys</h3>
        <p style="color:#64748b;margin:0;line-height:1.6;font-size:0.95rem">Negotiation, inspection, and closing support end-to-end.</p>
      </div>
    </div>
  </div>
</section>

<section id="agents" style="padding:88px 24px;background:#fff">
  <div style="max-width:1000px;margin:0 auto">
    <h2 style="text-align:center;font-size:2rem;font-weight:800;margin:0 0 40px">Top agents</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
      <div style="text-align:center;padding:28px 20px;border:1px solid #e2e8f0;border-radius:16px">
        <div style="width:80px;height:80px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(135deg,#0d9488,#14b8a6)"></div>
        <div style="font-weight:700">Maria Santos</div>
        <div style="color:#64748b;font-size:0.9rem;margin:4px 0 8px">Luxury & waterfront</div>
        <div style="color:#0f766e;font-size:0.85rem;font-weight:600">48 homes sold · 2025</div>
      </div>
      <div style="text-align:center;padding:28px 20px;border:1px solid #e2e8f0;border-radius:16px">
        <div style="width:80px;height:80px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(135deg,#0369a1,#0ea5e9)"></div>
        <div style="font-weight:700">David Kim</div>
        <div style="color:#64748b;font-size:0.9rem;margin:4px 0 8px">First-time buyers</div>
        <div style="color:#0f766e;font-size:0.85rem;font-weight:600">61 homes sold · 2025</div>
      </div>
      <div style="text-align:center;padding:28px 20px;border:1px solid #e2e8f0;border-radius:16px">
        <div style="width:80px;height:80px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(135deg,#7c3aed,#a78bfa)"></div>
        <div style="font-weight:700">Priya Shah</div>
        <div style="color:#64748b;font-size:0.9rem;margin:4px 0 8px">Investment properties</div>
        <div style="color:#0f766e;font-size:0.85rem;font-weight:600">37 homes sold · 2025</div>
      </div>
    </div>
  </div>
</section>

<section id="contact" style="padding:72px 24px;background:#0f766e;color:#fff;text-align:center">
  <div style="max-width:560px;margin:0 auto">
    <h2 style="font-size:2rem;font-weight:800;margin:0 0 0.75rem">Thinking of buying or selling?</h2>
    <p style="opacity:0.9;margin:0 0 1.5rem;line-height:1.65">Get a free home valuation or a curated list of homes in your budget.</p>
    <a href="#" style="display:inline-block;padding:14px 28px;background:#fff;color:#0f766e;border-radius:10px;text-decoration:none;font-weight:700">Talk to an agent</a>
  </div>
</section>

<footer style="background:#042f2e;color:#ccfbf1;padding:48px 24px 24px">
  <div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap">
    <div>
      <div style="font-weight:800;font-size:1.2rem;color:#fff;margin-bottom:8px">HomeFinders</div>
      <div style="opacity:0.8;font-size:0.9rem">Licensed brokerage · Equal housing opportunity</div>
    </div>
    <div style="display:flex;gap:24px;font-size:0.9rem;opacity:0.85"><span>Buy</span><span>Sell</span><span>Rent</span><span>Careers</span></div>
  </div>
  <div style="max-width:1100px;margin:24px auto 0;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);font-size:0.85rem;opacity:0.7;text-align:center">&copy; 2026 HomeFinders Realty</div>
</footer>
`.trim(),
  },
];
