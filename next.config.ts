import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages with next-on-pages supports full Next.js features
  // No need for static export - uses Edge Runtime
  
  // Image optimization config for Cloudflare
  images: {
    unoptimized: true,
  },
  
  // Otimizações para desenvolvimento
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
  webpack: (config, { dev, isServer, webpack }) => {
    if (dev) {
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**']
      };
    }
    
    // Fix for "self is not defined" error
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    // Define self for both client and server
    if (webpack) {
      config.plugins.push(
        new webpack.DefinePlugin({
          self: isServer ? 'this' : 'window',
        })
      );
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
