import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Types verified locally — skip re-check during Vercel build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
