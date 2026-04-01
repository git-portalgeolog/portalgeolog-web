import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages with next-on-pages supports full Next.js features
  // No need for static export - uses Edge Runtime
  
  // Image optimization config for Cloudflare
  images: {
    unoptimized: true,
  },
  
  // Trailing slash for consistent paths
  trailingSlash: true,
};

export default nextConfig;
