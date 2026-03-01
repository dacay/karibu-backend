import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Allow assets (logos, avatars) served from the Karibu CDN
        protocol: "https",
        hostname: new URL(
          process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? "https://cdn.karibu.ai"
        ).hostname,
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
