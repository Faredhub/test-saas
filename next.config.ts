import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // pdfkit references its AFM font data via __dirname at runtime; keep it as a
  // real Node module so the relative file reads resolve correctly in standalone.
  serverExternalPackages: ["pdfkit", "fontkit"],
  outputFileTracingIncludes: {
    "/api/finance/payroll/payslips/[id]/pdf": [
      "./node_modules/pdfkit/js/data/**",
      "./node_modules/pdfkit/js/*.js",
      "./node_modules/pdfkit/package.json",
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  webpack: (config, { isServer }) => {
    // Prevent bundling of Node.js built-in modules in client-side code
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        dns: false,
        net: false,
        tls: false,
        os: false,
        util: false,
      };
    }
    return config;
  },
};

export default nextConfig;
