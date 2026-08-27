import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: "standalone",
  serverExternalPackages: ["node-7z", "7zip-bin-full"],
  images: {
    localPatterns: [
      {
        pathname: "/file/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
