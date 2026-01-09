import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/auth/"], // 禁止爬取管理后台和认证页面
    },
    sitemap: "https://www.wxkzd.com/sitemap.xml",
  };
}
