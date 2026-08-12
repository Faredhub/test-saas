// Pre-built website templates organized by industry niche.
// Each template provides the initial html/css for a GrapesJS page.

export type WebsiteTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail?: string;
  tags: string[];
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

export const websiteTemplates: WebsiteTemplate[] = [
  // ============================================================
  // BUSINESS
  // ============================================================
  {
    id: "business-pro",
    name: "Business Pro",
    category: "business",
    description: "Modern corporate website with services, about, team, and contact sections",
    tags: ["corporate", "agency", "consulting", "saas"],
    html: `<nav style="padding:16px 0;background:#fff;border-bottom:1px solid #e5e7eb">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding:0 20px">
    <div style="font-size:1.5rem;font-weight:800;color:#111827">AcmeCorp</div>
    <div style="display:flex;gap:2rem;align-items:center">
      <a href="#" style="color:#6b7280;text-decoration:none;font-weight:500">Services</a>
      <a href="#" style="color:#6b7280;text-decoration:none;font-weight:500">About</a>
      <a href="#" style="color:#6b7280;text-decoration:none;font-weight:500">Contact</a>
      <a href="#" style="padding:10px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Get Started</a>
    </div>
  </div>
</nav>
<section style="padding:100px 0;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-align:center">
  <div style="max-width:800px;margin:0 auto;padding:0 20px">
    <h1 style="font-size:3.5rem;font-weight:800;line-height:1.2;margin-bottom:1.5rem">Grow Your Business With Confidence</h1>
    <p style="font-size:1.25rem;opacity:0.9;margin-bottom:2.5rem;line-height:1.6">All-in-one platform to manage your operations, sales, and customer relationships.</p>
    <a href="#" style="display:inline-block;padding:16px 40px;background:#fff;color:#4f46e5;border-radius:10px;text-decoration:none;font-weight:700;font-size:1.1rem">Start Free Trial</a>
  </div>
</section>
<section style="padding:80px 0;background:#f9fafb">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px">
    <h2 style="text-align:center;font-size:2.25rem;font-weight:700;margin-bottom:3rem">Our Services</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2rem">
      <div style="background:#fff;padding:2rem;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06)"><h3 style="font-size:1.25rem;font-weight:600;margin-bottom:0.75rem">Consulting</h3><p style="color:#6b7280;line-height:1.6">Strategic business consulting to help you make informed decisions.</p></div>
      <div style="background:#fff;padding:2rem;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06)"><h3 style="font-size:1.25rem;font-weight:600;margin-bottom:0.75rem">Development</h3><p style="color:#6b7280;line-height:1.6">Custom software solutions tailored to your unique business needs.</p></div>
      <div style="background:#fff;padding:2rem;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06)"><h3 style="font-size:1.25rem;font-weight:600;margin-bottom:0.75rem">Support</h3><p style="color:#6b7280;line-height:1.6">24/7 dedicated support to keep your business running smoothly.</p></div>
    </div>
  </div>
</section>`,
    css: `* { box-sizing: border-box; margin: 0; } body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; }`,
  },

  // ============================================================
  // RESTAURANT
  // ============================================================
  {
    id: "restaurant-elegant",
    name: "Restaurant Elegant",
    category: "restaurant",
    description: "Elegant restaurant website with menu, reservations, and gallery",
    tags: ["restaurant", "cafe", "food", "dining", "bistro"],
    html: `<nav style="padding:16px 0;background:#1a1a2e;color:#fff">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding:0 20px">
    <div style="font-size:1.5rem;font-weight:700;font-family:Georgia,serif">La Maison</div>
    <div style="display:flex;gap:2rem">
      <a href="#" style="color:#ccc;text-decoration:none;font-weight:500">Menu</a>
      <a href="#" style="color:#ccc;text-decoration:none;font-weight:500">Reservations</a>
      <a href="#" style="color:#ccc;text-decoration:none;font-weight:500">Gallery</a>
      <a href="#" style="color:#ccc;text-decoration:none;font-weight:500">Contact</a>
      <a href="#" style="padding:8px 20px;background:#c9a96e;color:#1a1a2e;border-radius:6px;text-decoration:none;font-weight:700">Book a Table</a>
    </div>
  </div>
</nav>
<section style="padding:120px 0;background:linear-gradient(rgba(26,26,46,0.7),rgba(26,26,46,0.7)),url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200');background-size:cover;background-position:center;color:#fff;text-align:center">
  <div style="max-width:700px;margin:0 auto;padding:0 20px">
    <h1 style="font-family:Georgia,serif;font-size:4rem;margin-bottom:1rem;font-weight:400">Fine Dining Experience</h1>
    <p style="font-size:1.2rem;opacity:0.9;margin-bottom:2rem">Exquisite cuisine crafted with passion since 1998</p>
    <a href="#" style="display:inline-block;padding:14px 36px;background:#c9a96e;color:#1a1a2e;border-radius:8px;text-decoration:none;font-weight:700;font-size:1.1rem">View Our Menu</a>
  </div>
</section>
<section style="padding:80px 0;background:#faf9f7">
  <div style="max-width:1000px;margin:0 auto;padding:0 20px">
    <h2 style="text-align:center;font-family:Georgia,serif;font-size:2rem;margin-bottom:3rem;color:#1a1a2e">Our Specialties</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem">
      <div style="text-align:center"><div style="height:200px;background:#e5e0d8;border-radius:8px;margin-bottom:1rem"></div><h4 style="font-weight:600;margin-bottom:0.25rem">Grilled Salmon</h4><p style="color:#6b7280">$28</p></div>
      <div style="text-align:center"><div style="height:200px;background:#e5e0d8;border-radius:8px;margin-bottom:1rem"></div><h4 style="font-weight:600;margin-bottom:0.25rem">Beef Wellington</h4><p style="color:#6b7280">$42</p></div>
      <div style="text-align:center"><div style="height:200px;background:#e5e0d8;border-radius:8px;margin-bottom:1rem"></div><h4 style="font-weight:600;margin-bottom:0.25rem">Tiramisu</h4><p style="color:#6b7280">$14</p></div>
    </div>
  </div>
</section>
<section style="padding:80px 0;background:#1a1a2e;color:#fff;text-align:center">
  <div style="max-width:500px;margin:0 auto;padding:0 20px">
    <h3 style="font-family:Georgia,serif;font-size:1.75rem;margin-bottom:1rem">Make a Reservation</h3>
    <p style="opacity:0.8;margin-bottom:2rem">Call us at (555) 123-4567 or book online</p>
    <a href="#" style="display:inline-block;padding:14px 36px;background:#c9a96e;color:#1a1a2e;border-radius:8px;text-decoration:none;font-weight:700">Reserve Now</a>
  </div>
</section>`,
    css: `* { box-sizing: border-box; margin: 0; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1a2e; }`,
  },

  // ============================================================
  // REAL ESTATE
  // ============================================================
  {
    id: "realestate-modern",
    name: "Real Estate Modern",
    category: "realestate",
    description: "Property listing website with search, featured listings, and agent profiles",
    tags: ["realestate", "property", "broker", "agency"],
    html: `<nav style="padding:16px 0;background:#fff;border-bottom:1px solid #e5e7eb">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding:0 20px">
    <div style="font-size:1.5rem;font-weight:800;color:#0f766e">HomeFinders</div>
    <div style="display:flex;gap:2rem;align-items:center">
      <a href="#" style="color:#6b7280;text-decoration:none;font-weight:500">Buy</a>
      <a href="#" style="color:#6b7280;text-decoration:none;font-weight:500">Rent</a>
      <a href="#" style="color:#6b7280;text-decoration:none;font-weight:500">Sell</a>
      <a href="#" style="color:#6b7280;text-decoration:none;font-weight:500">Agents</a>
      <a href="#" style="padding:10px 20px;background:#0f766e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Contact</a>
    </div>
  </div>
</nav>
<section style="padding:80px 0;background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;text-align:center">
  <div style="max-width:700px;margin:0 auto;padding:0 20px">
    <h1 style="font-size:3rem;font-weight:800;margin-bottom:1rem">Find Your Dream Home</h1>
    <p style="font-size:1.2rem;opacity:0.9;margin-bottom:2rem">Search thousands of properties in your area</p>
    <div style="display:flex;gap:0.5rem;max-width:500px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden">
      <input placeholder="City, neighborhood, or ZIP" style="flex:1;padding:14px;border:none;font-size:1rem;outline:none;color:#111827" />
      <button style="padding:14px 24px;background:#0f766e;color:#fff;border:none;font-weight:600;cursor:pointer;font-size:1rem">Search</button>
    </div>
  </div>
</section>
<section style="padding:80px 0">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px">
    <h2 style="font-size:2rem;font-weight:700;margin-bottom:2rem">Featured Properties</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem">
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="height:220px;background:#d1d5db"></div>
        <div style="padding:1.25rem"><h4 style="font-weight:600;margin-bottom:0.25rem">$450,000</h4><p style="color:#6b7280;margin-bottom:0.5rem">3 bd | 2 ba | 1,800 sqft</p><p style="color:#6b7280">123 Main St, Austin TX</p></div>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="height:220px;background:#d1d5db"></div>
        <div style="padding:1.25rem"><h4 style="font-weight:600;margin-bottom:0.25rem">$620,000</h4><p style="color:#6b7280;margin-bottom:0.5rem">4 bd | 3 ba | 2,400 sqft</p><p style="color:#6b7280">456 Oak Ave, Dallas TX</p></div>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="height:220px;background:#d1d5db"></div>
        <div style="padding:1.25rem"><h4 style="font-weight:600;margin-bottom:0.25rem">$380,000</h4><p style="color:#6b7280;margin-bottom:0.5rem">2 bd | 2 ba | 1,200 sqft</p><p style="color:#6b7280">789 Pine Rd, Houston TX</p></div>
      </div>
    </div>
  </div>
</section>`,
    css: `* { box-sizing: border-box; margin: 0; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; }`,
  },

  // ============================================================
  // PORTFOLIO
  // ============================================================
  {
    id: "portfolio-creative",
    name: "Creative Portfolio",
    category: "portfolio",
    description: "Minimalist portfolio for designers, photographers, and creatives",
    tags: ["portfolio", "creative", "designer", "photographer", "artist"],
    html: `<nav style="padding:20px 0">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding:0 20px">
    <div style="font-size:1.5rem;font-weight:300;letter-spacing:0.1em">JANE DOE</div>
    <div style="display:flex;gap:2rem">
      <a href="#" style="color:#111827;text-decoration:none;font-weight:400">Work</a>
      <a href="#" style="color:#111827;text-decoration:none;font-weight:400">About</a>
      <a href="#" style="color:#111827;text-decoration:none;font-weight:400">Blog</a>
      <a href="#" style="color:#111827;text-decoration:none;font-weight:400">Contact</a>
    </div>
  </div>
</nav>
<section style="padding:60px 0 80px;text-align:center">
  <div style="max-width:600px;margin:0 auto;padding:0 20px">
    <h1 style="font-size:3rem;font-weight:300;margin-bottom:1rem;letter-spacing:-0.02em">Designer & Art Director</h1>
    <p style="font-size:1.2rem;color:#6b7280;line-height:1.6">I create meaningful digital experiences that help brands connect with people.</p>
  </div>
</section>
<section style="padding:0 20px 80px">
  <div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem">
    <div style="background:#f3f4f6;height:400px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:1.2rem">Project 1</div>
    <div style="background:#f3f4f6;height:400px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:1.2rem">Project 2</div>
    <div style="background:#f3f4f6;height:300px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:1.2rem">Project 3</div>
    <div style="background:#f3f4f6;height:300px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:1.2rem">Project 4</div>
  </div>
</section>
<section style="padding:80px 0;text-align:center;background:#111827;color:#fff">
  <div style="max-width:500px;margin:0 auto;padding:0 20px">
    <h2 style="font-size:2rem;font-weight:300;margin-bottom:1rem">Let's Work Together</h2>
    <p style="opacity:0.7;margin-bottom:2rem;line-height:1.6">I'm always open to new opportunities and collaborations.</p>
    <a href="#" style="display:inline-block;padding:14px 36px;border:2px solid rgba(255,255,255,0.3);color:#fff;border-radius:4px;text-decoration:none;font-weight:400;letter-spacing:0.05em">GET IN TOUCH</a>
  </div>
</section>`,
    css: `* { box-sizing: border-box; margin: 0; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; }`,
  },

  // ============================================================
  // ECOMMERCE
  // ============================================================
  {
    id: "ecommerce-store",
    name: "Online Store",
    category: "ecommerce",
    description: "Clean eCommerce storefront with hero, collections, and featured products",
    tags: ["ecommerce", "store", "shop", "retail", "products"],
    html: `<nav style="padding:16px 0;background:#fff;border-bottom:1px solid #e5e7eb">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding:0 20px">
    <div style="font-size:1.5rem;font-weight:800;color:#7c3aed">SHOPCO</div>
    <div style="display:flex;gap:2rem;align-items:center">
      <a href="#" style="color:#6b7280;text-decoration:none;font-weight:500">Shop</a>
      <a href="#" style="color:#6b7280;text-decoration:none;font-weight:500">Collections</a>
      <a href="#" style="color:#6b7280;text-decoration:none;font-weight:500">About</a>
      <span style="font-weight:600;color:#7c3aed">Cart (0)</span>
    </div>
  </div>
</nav>
<section style="padding:100px 0;background:#faf5ff;text-align:center">
  <div style="max-width:600px;margin:0 auto;padding:0 20px">
    <h1 style="font-size:3.5rem;font-weight:800;color:#7c3aed;margin-bottom:1rem">New Collection</h1>
    <p style="font-size:1.2rem;color:#6b7280;margin-bottom:2rem">Discover our latest arrivals. Curated with care for you.</p>
    <a href="#" style="display:inline-block;padding:16px 40px;background:#7c3aed;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:1.1rem">Shop Now</a>
  </div>
</section>
<section style="padding:80px 0">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px">
    <h2 style="font-size:2rem;font-weight:700;margin-bottom:2rem">Featured Products</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem">
      <div><div style="background:#f3f4f6;height:280px;border-radius:12px;margin-bottom:1rem"></div><p style="font-weight:500">Classic Tee</p><p style="color:#7c3aed;font-weight:700">$29.00</p></div>
      <div><div style="background:#f3f4f6;height:280px;border-radius:12px;margin-bottom:1rem"></div><p style="font-weight:500">Denim Jacket</p><p style="color:#7c3aed;font-weight:700">$89.00</p></div>
      <div><div style="background:#f3f4f6;height:280px;border-radius:12px;margin-bottom:1rem"></div><p style="font-weight:500">Leather Bag</p><p style="color:#7c3aed;font-weight:700">$149.00</p></div>
      <div><div style="background:#f3f4f6;height:280px;border-radius:12px;margin-bottom:1rem"></div><p style="font-weight:500">Sneakers</p><p style="color:#7c3aed;font-weight:700">$79.00</p></div>
    </div>
  </div>
</section>`,
    css: `* { box-sizing: border-box; margin: 0; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; }`,
  },

  // ============================================================
  // HEALTH & WELLNESS
  // ============================================================
  {
    id: "wellness-center",
    name: "Wellness Center",
    category: "health",
    description: "Spa and wellness center with services, team, and booking",
    tags: ["health", "spa", "yoga", "wellness", "fitness", "gym"],
    html: `<section style="padding:120px 0;background:linear-gradient(135deg,#047857,#059669);color:#fff;text-align:center">
  <div style="max-width:700px;margin:0 auto;padding:0 20px">
    <h1 style="font-size:3.5rem;font-weight:300;margin-bottom:1rem;font-family:Georgia,serif">Serenity Spa & Wellness</h1>
    <p style="font-size:1.2rem;opacity:0.9;margin-bottom:2.5rem">Restore balance to your mind, body, and spirit</p>
    <div style="display:flex;gap:1rem;justify-content:center">
      <a href="#" style="padding:14px 36px;background:#fff;color:#047857;border-radius:50px;text-decoration:none;font-weight:600">Book Now</a>
      <a href="#" style="padding:14px 36px;border:2px solid rgba(255,255,255,0.5);color:#fff;border-radius:50px;text-decoration:none;font-weight:600">View Services</a>
    </div>
  </div>
</section>
<section style="padding:80px 0;background:#f0fdf4">
  <div style="max-width:1000px;margin:0 auto;padding:0 20px">
    <h2 style="text-align:center;font-size:2rem;font-weight:600;margin-bottom:3rem;color:#047857">Our Services</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2rem">
      <div style="text-align:center;padding:2rem;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04)"><div style="font-size:3rem;margin-bottom:1rem">💆</div><h3 style="font-weight:600;margin-bottom:0.5rem">Massage Therapy</h3><p style="color:#6b7280">Relaxing and therapeutic massages to release tension.</p></div>
      <div style="text-align:center;padding:2rem;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04)"><div style="font-size:3rem;margin-bottom:1rem">🧘</div><h3 style="font-weight:600;margin-bottom:0.5rem">Yoga Classes</h3><p style="color:#6b7280">Daily yoga sessions for all levels, from beginner to advanced.</p></div>
      <div style="text-align:center;padding:2rem;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04)"><div style="font-size:3rem;margin-bottom:1rem">🧖</div><h3 style="font-weight:600;margin-bottom:0.5rem">Facial Treatments</h3><p style="color:#6b7280">Rejuvenating facials using organic, natural products.</p></div>
    </div>
  </div>
</section>`,
    css: `* { box-sizing: border-box; margin: 0; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; }`,
  },

  // ============================================================
  // EDUCATION
  // ============================================================
  {
    id: "education-academy",
    name: "Online Academy",
    category: "education",
    description: "Online learning platform with courses, testimonials, and enrollment CTA",
    tags: ["education", "courses", "learning", "school", "academy"],
    html: `<section style="padding:100px 0;background:#1e3a5f;color:#fff;text-align:center">
  <div style="max-width:700px;margin:0 auto;padding:0 20px">
    <h1 style="font-size:3rem;font-weight:800;margin-bottom:1rem">Learn From the Best</h1>
    <p style="font-size:1.2rem;opacity:0.85;margin-bottom:2.5rem;line-height:1.6">Access 500+ courses taught by industry experts. Learn at your own pace, from anywhere.</p>
    <div style="display:flex;gap:1rem;justify-content:center">
      <a href="#" style="padding:16px 36px;background:#f59e0b;color:#1e3a5f;border-radius:8px;text-decoration:none;font-weight:700;font-size:1.1rem">Start Learning Free</a>
      <a href="#" style="padding:16px 36px;border:2px solid rgba(255,255,255,0.3);color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Browse Courses</a>
    </div>
  </div>
</section>
<section style="padding:80px 0">
  <div style="max-width:1100px;margin:0 auto;padding:0 20px">
    <h2 style="text-align:center;font-size:2rem;font-weight:700;margin-bottom:3rem">Popular Courses</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem">
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden"><div style="height:180px;background:linear-gradient(135deg,#3b82f6,#8b5cf6)"></div><div style="padding:1.25rem"><span style="color:#3b82f6;font-size:0.85rem;font-weight:600">Web Development</span><h4 style="font-weight:600;margin:0.5rem 0">Full-Stack JavaScript</h4><p style="color:#6b7280;font-size:0.9rem">12 weeks • Intermediate</p></div></div>
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden"><div style="height:180px;background:linear-gradient(135deg,#10b981,#34d399)"></div><div style="padding:1.25rem"><span style="color:#10b981;font-size:0.85rem;font-weight:600">Data Science</span><h4 style="font-weight:600;margin:0.5rem 0">Python for Data Analysis</h4><p style="color:#6b7280;font-size:0.9rem">8 weeks • Beginner</p></div></div>
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden"><div style="height:180px;background:linear-gradient(135deg,#f59e0b,#fbbf24)"></div><div style="padding:1.25rem"><span style="color:#f59e0b;font-size:0.85rem;font-weight:600">Design</span><h4 style="font-weight:600;margin:0.5rem 0">UI/UX Design Masterclass</h4><p style="color:#6b7280;font-size:0.9rem">6 weeks • All Levels</p></div></div>
    </div>
  </div>
</section>`,
    css: `* { box-sizing: border-box; margin: 0; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; }`,
  },

  // ============================================================
  // LANDING PAGE - SAAS
  // ============================================================
  {
    id: "saas-landing",
    name: "SaaS Landing",
    category: "landing",
    description: "High-conversion SaaS landing page with features, pricing, and CTA",
    tags: ["saas", "startup", "product", "tech", "landing"],
    html: `<section style="padding:120px 0;text-align:center">
  <div style="max-width:700px;margin:0 auto;padding:0 20px">
    <span style="display:inline-block;padding:6px 16px;background:#eff6ff;color:#2563eb;border-radius:50px;font-size:0.85rem;font-weight:600;margin-bottom:1.5rem">🚀 Now with AI-powered features</span>
    <h1 style="font-size:3.5rem;font-weight:800;line-height:1.15;margin-bottom:1.5rem">Your workflow.<br/>Supercharged.</h1>
    <p style="font-size:1.25rem;color:#6b7280;margin-bottom:2.5rem;line-height:1.6">The all-in-one platform that helps teams move faster, collaborate better, and deliver results.</p>
    <div style="display:flex;gap:1rem;justify-content:center">
      <a href="#" style="padding:16px 36px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:1.05rem">Start Free Trial</a>
      <a href="#" style="padding:16px 36px;background:#fff;color:#2563eb;border:2px solid #e5e7eb;border-radius:10px;text-decoration:none;font-weight:600">Watch Demo</a>
    </div>
    <p style="color:#9ca3af;margin-top:1rem;font-size:0.9rem">No credit card required • 14-day free trial</p>
  </div>
</section>
<section style="padding:80px 0;background:#f9fafb">
  <div style="max-width:1100px;margin:0 auto;padding:0 20px">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3rem">
      <div><div style="font-size:2rem;margin-bottom:1rem">⚡</div><h3 style="font-weight:700;margin-bottom:0.5rem">Lightning Fast</h3><p style="color:#6b7280;line-height:1.6">Optimized for speed with sub-second response times.</p></div>
      <div><div style="font-size:2rem;margin-bottom:1rem">🔐</div><h3 style="font-weight:700;margin-bottom:0.5rem">Enterprise Security</h3><p style="color:#6b7280;line-height:1.6">SOC 2 compliant with end-to-end encryption.</p></div>
      <div><div style="font-size:2rem;margin-bottom:1rem">🔄</div><h3 style="font-weight:700;margin-bottom:0.5rem">Seamless Integrations</h3><p style="color:#6b7280;line-height:1.6">Connect with 200+ tools you already use.</p></div>
    </div>
  </div>
</section>
<section style="padding:80px 0">
  <div style="max-width:900px;margin:0 auto;padding:0 20px">
    <h2 style="text-align:center;font-size:2rem;font-weight:700;margin-bottom:3rem">Simple, Transparent Pricing</h2>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2rem">
      <div style="text-align:center;padding:2.5rem;border:1px solid #e5e7eb;border-radius:16px"><p style="font-weight:600;margin-bottom:0.5rem">Starter</p><div style="font-size:3rem;font-weight:800">$19<span style="font-size:1rem;color:#6b7280">/mo</span></div><ul style="list-style:none;padding:0;margin:1.5rem 0;color:#6b7280;line-height:2.2"><li>5 team members</li><li>10 projects</li><li>Basic analytics</li><li>Email support</li></ul><a href="#" style="display:block;padding:14px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Get Started</a></div>
      <div style="text-align:center;padding:2.5rem;background:#eff6ff;border:2px solid #2563eb;border-radius:16px"><p style="font-weight:600;margin-bottom:0.5rem">Pro</p><div style="font-size:3rem;font-weight:800">$49<span style="font-size:1rem;color:#6b7280">/mo</span></div><ul style="list-style:none;padding:0;margin:1.5rem 0;color:#6b7280;line-height:2.2"><li>Unlimited members</li><li>Unlimited projects</li><li>Advanced analytics</li><li>Priority support</li><li>API access</li></ul><a href="#" style="display:block;padding:14px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Get Started</a></div>
    </div>
  </div>
</section>`,
    css: `* { box-sizing: border-box; margin: 0; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; }`,
  },

  // ============================================================
  // EVENT / CONFERENCE
  // ============================================================
  {
    id: "event-conference",
    name: "Conference 2026",
    category: "event",
    description: "Event landing page with schedule, speakers, and registration",
    tags: ["event", "conference", "meetup", "webinar", "tickets"],
    html: `<section style="padding:100px 0;background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;text-align:center">
  <div style="max-width:700px;margin:0 auto;padding:0 20px">
    <span style="display:inline-block;padding:6px 16px;background:rgba(255,255,255,0.15);border-radius:50px;font-size:0.9rem;margin-bottom:1.5rem">📅 October 15-17, 2026 • San Francisco</span>
    <h1 style="font-size:4rem;font-weight:900;margin-bottom:1rem;line-height:1.1">TechConf 2026</h1>
    <p style="font-size:1.3rem;opacity:0.85;margin-bottom:2.5rem">Three days of inspiring talks, hands-on workshops, and networking with the brightest minds in tech.</p>
    <div style="display:flex;gap:1rem;justify-content:center">
      <a href="#" style="padding:16px 40px;background:#f59e0b;color:#1e1b4b;border-radius:8px;text-decoration:none;font-weight:800;font-size:1.1rem">Get Your Ticket</a>
      <a href="#" style="padding:16px 40px;border:2px solid rgba(255,255,255,0.3);color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Become a Sponsor</a>
    </div>
  </div>
</section>
<section style="padding:80px 0">
  <div style="max-width:1000px;margin:0 auto;padding:0 20px">
    <h2 style="text-align:center;font-size:2rem;font-weight:700;margin-bottom:3rem">Featured Speakers</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem">
      <div style="text-align:center"><div style="width:100px;height:100px;border-radius:50%;background:#e5e7eb;margin:0 auto 1rem"></div><h4 style="font-weight:600">Dr. Sarah Chen</h4><p style="color:#6b7280;font-size:0.9rem">AI Research, Google</p></div>
      <div style="text-align:center"><div style="width:100px;height:100px;border-radius:50%;background:#e5e7eb;margin:0 auto 1rem"></div><h4 style="font-weight:600">Mark Rivera</h4><p style="color:#6b7280;font-size:0.9rem">CTO, Stripe</p></div>
      <div style="text-align:center"><div style="width:100px;height:100px;border-radius:50%;background:#e5e7eb;margin:0 auto 1rem"></div><h4 style="font-weight:600">Aisha Patel</h4><p style="color:#6b7280;font-size:0.9rem">VP Eng, Notion</p></div>
      <div style="text-align:center"><div style="width:100px;height:100px;border-radius:50%;background:#e5e7eb;margin:0 auto 1rem"></div><h4 style="font-weight:600">James Park</h4><p style="color:#6b7280;font-size:0.9rem">Founder, Linear</p></div>
    </div>
  </div>
</section>
<section style="padding:80px 0;background:#f8fafc;text-align:center">
  <div style="max-width:600px;margin:0 auto;padding:0 20px">
    <h2 style="font-size:2rem;font-weight:700;margin-bottom:1rem">Get Your Early Bird Ticket</h2>
    <p style="color:#6b7280;margin-bottom:1.5rem">Save 40% before September 1st</p>
    <div style="font-size:3rem;font-weight:900;color:#1e1b4b;margin-bottom:1.5rem">$299 <span style="font-size:1.2rem;color:#9ca3af;text-decoration:line-through">$499</span></div>
    <a href="#" style="display:inline-block;padding:16px 40px;background:#1e1b4b;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:1.1rem">Register Now</a>
  </div>
</section>`,
    css: `* { box-sizing: border-box; margin: 0; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; }`,
  },
];

// Get templates filtered by category
export function getTemplatesByCategory(category: string): WebsiteTemplate[] {
  return websiteTemplates.filter((t) => t.category === category);
}

// Get all unique categories from templates
export function getTemplateCategories(): typeof TEMPLATE_CATEGORIES {
  return TEMPLATE_CATEGORIES;
}
