import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "wxkzd.oss-cn-beijing.aliyuncs.com",
      },
    ],
  },
};

export default nextConfig;
