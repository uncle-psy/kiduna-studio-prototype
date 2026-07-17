import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  basePath: '/review/screens',
  typescript: { ignoreBuildErrors: true },

  turbopack: {
    resolveAlias: {
      fs: { browser: "./noop.js" },
    },
  },

  // Allow images from the internal Payload CMS
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'kiduna.studio',
        pathname: '/media/**',
      },
    ],
  },

  async redirects() {
    return [
      {
        source: '/agents',
        destination: '/agents/avatar',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
