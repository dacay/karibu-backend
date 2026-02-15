import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Allow logos served from the Karibu CDN
        protocol: "https",
        hostname: new URL(
          process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.karibu.ai"
        ).hostname,
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
