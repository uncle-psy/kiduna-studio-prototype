import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const reviewOrigin = process.env.REVIEW_APP_ORIGIN || "https://kiduna-review-source.vercel.app";
    return {
      beforeFiles: [
        {
          source: "/review/screens/:path*",
          destination: `${reviewOrigin}/review/screens/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
