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
          {
            key: "Content-Security-Policy",
            value: [
              // Scripts : autoriser les scripts same-origin + notre backend API
              // 'unsafe-eval' is needed in dev mode for react-refresh runtime.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.cinetpay.com https://cdnjs.cloudflare.com",
              // Styles
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.cinetpay.com",
              // Fonts Google
              "font-src 'self' https://fonts.gstatic.com",
              // Images : autoriser les logos IPTV externe (tvg-logo)
              "img-src 'self' data: blob: https: http:",
              // Médias : le proxy local streame les segments TV
              // blob: nécessaire pour le MediaSource API de HLS.js
              "media-src 'self' blob: https: http: data: http://127.0.0.1:3001 http://localhost:3001",
              // Connexions réseau (fetch, XHR, WebSocket)
              // Notre proxy backend + livestreams (via proxy)
              "connect-src 'self' blob: https: http: ws: wss:",
              // Workers : blob: nécessaire pour MSE / HLS.js
              "worker-src 'self' blob:",
              // Frames
              "frame-src 'self' https://checkout.cinetpay.com https://*.cinetpay.com",
              // Objets (Flash etc.)
              "object-src 'none'",
              // Base URI
              "base-uri 'self'",
            ].join("; "),
          },
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
