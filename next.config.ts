import type { NextConfig } from "next";
import withNextIntl from "next-intl/plugin";
const nextConfig: NextConfig = withNextIntl()({
  /* config options here */
  reactCompiler: false,
  experimental: {
    turbo: {
      resolveAlias: {
        recharts: "recharts/esm/index.js",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        port: "",
      },
    ],
  },
});

export default nextConfig;
