import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages with next-on-pages supports full Next.js features
  // No need for static export - uses Edge Runtime
  
  // Image optimization config for Cloudflare
  images: {
    unoptimized: true,
  },
  
  // Otimizações para desenvolvimento
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Otimizar recompilação
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  // Desabilitar ESLint durante o build para Cloudflare
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Desabilitar TypeScript errors durante o build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Reduzir uso de memória
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**']
      };
    }
    
    // Otimizar bundle
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };
    
    return config;
  },
};

export default nextConfig;
