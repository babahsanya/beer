import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  allowedDevOrigins: [
    "*.space-z.ai",
  ],
  images: {
    // Allow external beer label images from common sources
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.untappd.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
    // Use unoptimized for unknown external domains to avoid SSRF via image optimization
    unoptimized: true,
  },
};

export default nextConfig;