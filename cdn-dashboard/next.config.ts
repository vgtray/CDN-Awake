import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  
  // Proxy API requests to the backend to avoid CORS issues in development
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://api:3000/api/:path*',
        },
        {
          source: '/files/:path*',
          destination: 'http://api:3000/files/:path*',
        },
        {
          source: '/download/:path*',
          destination: 'http://api:3000/download/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
