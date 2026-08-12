"use client";

import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import grapesjs, { type Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import basicBlocks from "grapesjs-blocks-basic";

type GrapesJSEditorProps = {
  initialHtml?: string;
  initialCss?: string;
  onSave: (data: { html: string; css: string }) => void;
};

export type GrapesJSEditorHandle = {
  getEditor: () => Editor | null;
};

const customBlocks = (editor: Editor) => {
  const bm = editor.BlockManager;

  bm.add("hero-section", {
    label: "Hero Section",
    category: "Sections",
    content: `<section style="padding:80px 0;text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff">
  <div style="max-width:800px;margin:0 auto;padding:0 20px">
    <h1 style="font-size:3rem;margin-bottom:1rem;font-weight:800">Welcome to Your Site</h1>
    <p style="font-size:1.25rem;margin-bottom:2rem;opacity:0.9">Build beautiful websites with drag and drop. No coding required.</p>
    <a href="#" style="display:inline-block;padding:14px 32px;background:#fff;color:#667eea;border-radius:8px;text-decoration:none;font-weight:600;font-size:1.1rem">Get Started</a>
    <a href="#" style="display:inline-block;padding:14px 32px;margin-left:12px;border:2px solid rgba(255,255,255,0.5);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:1.1rem">Learn More</a>
  </div>
</section>`,
  });

  bm.add("features-grid", {
    label: "Features Grid",
    category: "Sections",
    content: `<section style="padding:80px 0;background:#f8fafc">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px">
    <h2 style="text-align:center;font-size:2rem;margin-bottom:3rem;font-weight:700">Features</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2rem">
      <div style="text-align:center;padding:2rem;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <div style="font-size:2.5rem;margin-bottom:1rem">🚀</div>
        <h3 style="margin-bottom:0.5rem;font-weight:600">Fast Performance</h3>
        <p style="color:#64748b">Lightning-fast load times for the best user experience.</p>
      </div>
      <div style="text-align:center;padding:2rem;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <div style="font-size:2.5rem;margin-bottom:1rem">🔒</div>
        <h3 style="margin-bottom:0.5rem;font-weight:600">Secure</h3>
        <p style="color:#64748b">Enterprise-grade security with SSL encryption.</p>
      </div>
      <div style="text-align:center;padding:2rem;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <div style="font-size:2.5rem;margin-bottom:1rem">📱</div>
        <h3 style="margin-bottom:0.5rem;font-weight:600">Mobile Ready</h3>
        <p style="color:#64748b">Fully responsive design that works on all devices.</p>
      </div>
    </div>
  </div>
</section>`,
  });

  bm.add("cta-section", {
    label: "Call to Action",
    category: "Sections",
    content: `<section style="padding:80px 0;text-align:center;background:#1e293b;color:#fff">
  <div style="max-width:600px;margin:0 auto;padding:0 20px">
    <h2 style="font-size:2rem;margin-bottom:1rem;font-weight:700">Ready to get started?</h2>
    <p style="font-size:1.1rem;margin-bottom:2rem;opacity:0.8">Join thousands of happy customers today.</p>
    <a href="#" style="display:inline-block;padding:14px 40px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:1.1rem">Start Free Trial</a>
  </div>
</section>`,
  });

  bm.add("stats-section", {
    label: "Stats Bar",
    category: "Sections",
    content: `<section style="padding:60px 0;background:#fff;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">
  <div style="max-width:1000px;margin:0 auto;display:flex;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:2rem;padding:0 20px">
    <div><div style="font-size:2.5rem;font-weight:800;color:#3b82f6">10K+</div><div style="color:#64748b;margin-top:0.25rem">Customers</div></div>
    <div><div style="font-size:2.5rem;font-weight:800;color:#3b82f6">50+</div><div style="color:#64748b;margin-top:0.25rem">Integrations</div></div>
    <div><div style="font-size:2.5rem;font-weight:800;color:#3b82f6">99.9%</div><div style="color:#64748b;margin-top:0.25rem">Uptime</div></div>
    <div><div style="font-size:2.5rem;font-weight:800;color:#3b82f6">24/7</div><div style="color:#64748b;margin-top:0.25rem">Support</div></div>
  </div>
</section>`,
  });

  bm.add("testimonial", {
    label: "Testimonial",
    category: "Sections",
    content: `<section style="padding:80px 0;background:#f8fafc;text-align:center">
  <div style="max-width:700px;margin:0 auto;padding:0 20px">
    <p style="font-size:1.25rem;line-height:1.8;color:#334155;font-style:italic;margin-bottom:2rem">"This is the best website builder I've ever used. The drag and drop interface makes it incredibly easy to create beautiful pages in minutes."</p>
    <div style="font-weight:600;color:#1e293b">John Doe</div>
    <div style="color:#64748b;font-size:0.9rem">CEO, Company Inc.</div>
  </div>
</section>`,
  });

  bm.add("contact-form", {
    label: "Contact Form",
    category: "Forms",
    content: `<section style="padding:80px 0;background:#fff">
  <div style="max-width:600px;margin:0 auto;padding:0 20px">
    <h2 style="text-align:center;font-size:2rem;margin-bottom:2rem;font-weight:700">Contact Us</h2>
    <form style="display:flex;flex-direction:column;gap:1rem">
      <input type="text" placeholder="Your Name" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:1rem;width:100%;box-sizing:border-box" />
      <input type="email" placeholder="Your Email" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:1rem;width:100%;box-sizing:border-box" />
      <textarea placeholder="Your Message" rows="4" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:1rem;width:100%;box-sizing:border-box;resize:vertical"></textarea>
      <button type="submit" style="padding:14px 32px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer">Send Message</button>
    </form>
  </div>
</section>`,
  });

  bm.add("newsletter-form", {
    label: "Newsletter Signup",
    category: "Forms",
    content: `<section style="padding:60px 0;background:#1e293b;color:#fff;text-align:center">
  <div style="max-width:500px;margin:0 auto;padding:0 20px">
    <h3 style="font-size:1.5rem;margin-bottom:0.5rem;font-weight:700">Subscribe to our Newsletter</h3>
    <p style="margin-bottom:1.5rem;opacity:0.8">Get the latest updates delivered to your inbox.</p>
    <form style="display:flex;gap:0.5rem;max-width:400px;margin:0 auto">
      <input type="email" placeholder="Enter your email" style="flex:1;padding:12px 16px;border:none;border-radius:8px;font-size:1rem" />
      <button type="submit" style="padding:12px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;white-space:nowrap">Subscribe</button>
    </form>
  </div>
</section>`,
  });

  bm.add("pricing-table", {
    label: "Pricing Table",
    category: "Sections",
    content: `<section style="padding:80px 0;background:#fff">
  <div style="max-width:1100px;margin:0 auto;padding:0 20px">
    <h2 style="text-align:center;font-size:2rem;margin-bottom:3rem;font-weight:700">Pricing Plans</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2rem">
      <div style="text-align:center;padding:2.5rem 2rem;border:1px solid #e2e8f0;border-radius:12px">
        <h3 style="font-size:1.25rem;margin-bottom:0.5rem">Starter</h3>
        <div style="font-size:2.5rem;font-weight:800;color:#3b82f6">$9<span style="font-size:1rem;color:#64748b">/mo</span></div>
        <ul style="list-style:none;padding:0;margin:1.5rem 0;color:#64748b;line-height:2"><li>5 Projects</li><li>10GB Storage</li><li>Basic Support</li></ul>
        <a href="#" style="display:block;padding:12px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Get Started</a>
      </div>
      <div style="text-align:center;padding:2.5rem 2rem;border:2px solid #3b82f6;border-radius:12px;box-shadow:0 4px 20px rgba(59,130,246,0.15);position:relative">
        <span style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#3b82f6;color:#fff;padding:4px 16px;border-radius:20px;font-size:0.8rem;font-weight:600">Popular</span>
        <h3 style="font-size:1.25rem;margin-bottom:0.5rem;margin-top:0.5rem">Professional</h3>
        <div style="font-size:2.5rem;font-weight:800;color:#3b82f6">$29<span style="font-size:1rem;color:#64748b">/mo</span></div>
        <ul style="list-style:none;padding:0;margin:1.5rem 0;color:#64748b;line-height:2"><li>Unlimited Projects</li><li>100GB Storage</li><li>Priority Support</li><li>API Access</li></ul>
        <a href="#" style="display:block;padding:12px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Get Started</a>
      </div>
      <div style="text-align:center;padding:2.5rem 2rem;border:1px solid #e2e8f0;border-radius:12px">
        <h3 style="font-size:1.25rem;margin-bottom:0.5rem">Enterprise</h3>
        <div style="font-size:2.5rem;font-weight:800;color:#3b82f6">$99<span style="font-size:1rem;color:#64748b">/mo</span></div>
        <ul style="list-style:none;padding:0;margin:1.5rem 0;color:#64748b;line-height:2"><li>Everything in Pro</li><li>Unlimited Storage</li><li>Dedicated Support</li><li>SLA Guarantee</li><li>Custom Integrations</li></ul>
        <a href="#" style="display:block;padding:12px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Contact Sales</a>
      </div>
    </div>
  </div>
</section>`,
  });

  bm.add("footer-section", {
    label: "Footer",
    category: "Sections",
    content: `<footer style="background:#1e293b;color:#fff;padding:60px 0 30px">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px">
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:2rem">
      <div>
        <h4 style="font-size:1.25rem;margin-bottom:1rem;font-weight:700">Brand</h4>
        <p style="color:#94a3b8;line-height:1.6">Building the future of web development with easy-to-use tools.</p>
      </div>
      <div>
        <h4 style="font-size:0.9rem;margin-bottom:1rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Product</h4>
        <ul style="list-style:none;padding:0;color:#94a3b8;line-height:2"><li>Features</li><li>Pricing</li><li>Integrations</li><li>Changelog</li></ul>
      </div>
      <div>
        <h4 style="font-size:0.9rem;margin-bottom:1rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Company</h4>
        <ul style="list-style:none;padding:0;color:#94a3b8;line-height:2"><li>About</li><li>Blog</li><li>Careers</li><li>Contact</li></ul>
      </div>
      <div>
        <h4 style="font-size:0.9rem;margin-bottom:1rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Legal</h4>
        <ul style="list-style:none;padding:0;color:#94a3b8;line-height:2"><li>Privacy</li><li>Terms</li><li>Cookies</li></ul>
      </div>
    </div>
    <div style="border-top:1px solid #334155;margin-top:2rem;padding-top:1.5rem;text-align:center;color:#64748b;font-size:0.9rem">&copy; 2026 Your Company. All rights reserved.</div>
  </div>
</footer>`,
  });

  bm.add("faq-section", {
    label: "FAQ Section",
    category: "Sections",
    content: `<section style="padding:80px 0;background:#f8fafc">
  <div style="max-width:800px;margin:0 auto;padding:0 20px">
    <h2 style="text-align:center;font-size:2rem;margin-bottom:3rem;font-weight:700">Frequently Asked Questions</h2>
    <div style="display:flex;flex-direction:column;gap:1rem">
      <div style="background:#fff;padding:1.5rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <h4 style="margin-bottom:0.5rem;font-weight:600">How does the free trial work?</h4>
        <p style="color:#64748b;margin:0">You can try all features free for 14 days. No credit card required.</p>
      </div>
      <div style="background:#fff;padding:1.5rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <h4 style="margin-bottom:0.5rem;font-weight:600">Can I change my plan later?</h4>
        <p style="color:#64748b;margin:0">Yes, you can upgrade or downgrade your plan at any time.</p>
      </div>
      <div style="background:#fff;padding:1.5rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <h4 style="margin-bottom:0.5rem;font-weight:600">Is there a setup fee?</h4>
        <p style="color:#64748b;margin:0">No, there are no setup fees. You only pay the monthly subscription.</p>
      </div>
    </div>
  </div>
</section>`,
  });

  bm.add("navbar-block", {
    label: "Navbar",
    category: "Sections",
    content: `<nav style="padding:16px 0;background:#fff;border-bottom:1px solid #e2e8f0">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding:0 20px">
    <div style="font-size:1.5rem;font-weight:800;color:#1e293b">Brand</div>
    <div style="display:flex;gap:1.5rem;align-items:center">
      <a href="#" style="color:#64748b;text-decoration:none;font-weight:500">Home</a>
      <a href="#" style="color:#64748b;text-decoration:none;font-weight:500">Features</a>
      <a href="#" style="color:#64748b;text-decoration:none;font-weight:500">Pricing</a>
      <a href="#" style="color:#64748b;text-decoration:none;font-weight:500">Contact</a>
      <a href="#" style="display:inline-block;padding:8px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Sign Up</a>
    </div>
  </div>
</nav>`,
  });
};

export const GrapesJSEditor = forwardRef<
  GrapesJSEditorHandle,
  GrapesJSEditorProps
>(function GrapesJSEditor({ initialHtml, initialCss, onSave }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = grapesjs.init({
      container: containerRef.current,
      height: "100%",
      width: "auto",
      storageManager: false,
      fromElement: false,
      plugins: [basicBlocks],
      pluginsOpts: {
        "grapesjs-blocks-basic": {
          blocks: [
            "column1",
            "column2",
            "column3",
            "column3-7",
            "text",
            "link",
            "image",
            "video",
            "map",
          ],
          flexGrid: true,
          addBasicStyle: true,
          category: "Basic",
        },
      },
      canvas: {
        styles: [
          "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
        ],
      },
      blockManager: {
        appendTo: "#blocks-container",
      },
      styleManager: {
        sectors: [
          {
            name: "General",
            properties: [
              { name: "Display", property: "display" },
              { name: "Position", property: "position" },
              { name: "Top", property: "top" },
              { name: "Right", property: "right" },
              { name: "Bottom", property: "bottom" },
              { name: "Left", property: "left" },
            ],
          },
          {
            name: "Dimension",
            open: false,
            properties: [
              { name: "Width", property: "width" },
              { name: "Height", property: "height" },
              { name: "Max Width", property: "max-width" },
              { name: "Min Height", property: "min-height" },
              { name: "Margin", property: "margin" },
              { name: "Padding", property: "padding" },
            ],
          },
          {
            name: "Typography",
            open: false,
            properties: [
              { name: "Font Size", property: "font-size" },
              { name: "Font Weight", property: "font-weight" },
              { name: "Letter Spacing", property: "letter-spacing" },
              { name: "Color", property: "color" },
              { name: "Line Height", property: "line-height" },
              { name: "Text Align", property: "text-align" },
              { name: "Text Decoration", property: "text-decoration" },
            ],
          },
          {
            name: "Decorations",
            open: false,
            properties: [
              { name: "Background Color", property: "background-color" },
              { name: "Background Image", property: "background-image" },
              { name: "Border Radius", property: "border-radius" },
              { name: "Border", property: "border" },
              { name: "Box Shadow", property: "box-shadow" },
            ],
          },
          {
            name: "Extra",
            open: false,
            properties: [
              { name: "Opacity", property: "opacity" },
              { name: "Transition", property: "transition" },
              { name: "Transform", property: "transform" },
            ],
          },
        ],
      },
    });

    editorRef.current = editor;

    customBlocks(editor);

    if (initialHtml || initialCss) {
      editor.setComponents(initialHtml ?? "");
      editor.setStyle(initialCss ?? "");
    }

    editor.Commands.add("save-db", {
      run() {
        const html = editor.getHtml();
        const css = editor.getCss() ?? "";
        onSave({ html, css });
      },
    });

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full w-full">
      <div
        id="blocks-container"
        className="w-[260px] shrink-0 border-r bg-background overflow-y-auto"
      />
      <div
        ref={containerRef}
        className="flex-1 h-full"
        style={{ minHeight: "100%" }}
      />
    </div>
  );
});
