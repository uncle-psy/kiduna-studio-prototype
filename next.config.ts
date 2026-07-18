import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gate 2 is a deterministic design lab: ship files only, with no server runtime.
  output: "export",
};

export default nextConfig;
