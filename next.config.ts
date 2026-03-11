import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    unoptimized: true,
    // 允许在开发环境中访问解析到私有 IP 的外部域名（如阿里云 OSS 在 VPN/代理环境下解析到私有 IP）
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wxkzd.oss-cn-beijing.aliyuncs.com",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/api/**",
      },
    ],
  },
};

export default nextConfig;
