import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  async redirects() {
    return [
      { source: "/flow", destination: "/royals-and-rogues/flow", permanent: true },
      { source: "/rules", destination: "/royals-and-rogues/rules", permanent: true },
      { source: "/cards", destination: "/royals-and-rogues/cards", permanent: true },
      { source: "/cards/:path*", destination: "/royals-and-rogues/cards/:path*", permanent: true },
      { source: "/compare", destination: "/royals-and-rogues/compare", permanent: true },
      { source: "/decorative", destination: "/royals-and-rogues/decorative", permanent: true },
      { source: "/reports", destination: "/royals-and-rogues/reports", permanent: true },
      { source: "/downloads", destination: "/royals-and-rogues/downloads", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/isometric",
          destination: "https://kiduna-isometric-scene-system.vercel.app/isometric",
        },
        {
          source: "/isometric/:path*",
          destination: "https://kiduna-isometric-scene-system.vercel.app/isometric/:path*",
        },
        {
          source: "/royals-and-rogues",
          destination: "https://kiduna-royals-and-rogues.vercel.app/royals-and-rogues",
        },
        {
          source: "/royals-and-rogues/:path*",
          destination: "https://kiduna-royals-and-rogues.vercel.app/royals-and-rogues/:path*",
        },
        {
          source: "/coherence",
          destination: "https://kiduna-coherence.vercel.app/coherence",
        },
        {
          source: "/coherence/:path*",
          destination: "https://kiduna-coherence.vercel.app/coherence/:path*",
        },
        {
          source: "/bellwether",
          destination: "https://kiduna-bellwether-reference-impleme.vercel.app/bellwether",
        },
        {
          source: "/bellwether/:path*",
          destination: "https://kiduna-bellwether-reference-impleme.vercel.app/bellwether/:path*",
        },
        {
          source: "/biology-deck",
          destination: "https://kiduna-biology-deck.vercel.app/biology-deck",
        },
        {
          source: "/biology-deck/:path*",
          destination: "https://kiduna-biology-deck.vercel.app/biology-deck/:path*",
        },
        {
          source: "/pop-culture-deck",
          destination: "https://kiduna-pop-culture-deck.vercel.app/pop-culture-deck",
        },
        {
          source: "/pop-culture-deck/:path*",
          destination: "https://kiduna-pop-culture-deck.vercel.app/pop-culture-deck/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
