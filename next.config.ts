import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname),

  async headers() {
    return [
      {
        // Appliqué à toutes les pages
        source: "/(.*)",
        headers: [
          // Anti-clickjacking
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          // Désactive le MIME sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
