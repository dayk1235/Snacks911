import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp'],
    deviceSizes: [400, 600, 800],
    imageSizes: [64, 128, 256],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },

  // Custom cache headers only for app-owned public assets.
  // Next already handles /_next/static with immutable caching.
  async headers() {
    if (process.env.NODE_ENV !== 'production') {
      return [];
    }

    return [
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

export default nextConfig;
