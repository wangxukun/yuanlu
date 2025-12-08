"use client";

import Breadcrumbs from "@/components/admin/breadcrumbs";
import React from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  // 根据路径生成面包屑数据
  const getBreadcrumbs = () => {
    const pathSegments = pathname.split("/").filter((segment) => segment);

    if (pathSegments.length === 0 || pathSegments[0] !== "admin") {
      return [];
    }

    const breadcrumbs = [{ label: "仪表盘", href: "/admin" }];

    if (pathSegments.length >= 2) {
      const section = pathSegments[1];

      switch (section) {
        case "podcasts":
          breadcrumbs.push({ label: "合集管理", href: "/admin/podcasts" });
          if (pathSegments.includes("create")) {
            breadcrumbs.push({
              label: "创建合集",
              href: "/admin/podcasts/create",
            });
          } else if (pathSegments.length >= 3 && pathSegments[2]) {
            breadcrumbs.push({
              label: "编辑合集",
              href: `/admin/podcasts/${pathSegments[2]}`,
            });
          }
          break;

        case "episodes":
          breadcrumbs.push({ label: "音频管理", href: "/admin/episodes" });
          if (pathSegments.includes("create")) {
            breadcrumbs.push({
              label: "创建音频",
              href: "/admin/episodes/create",
            });
          } else if (pathSegments.includes("contribute")) {
            breadcrumbs.push({
              label: "投稿音频",
              href: "/admin/episodes/contribute",
            });
          } else if (pathSegments.includes("edit")) {
            breadcrumbs.push({
              label: "编辑音频",
              href: `/admin/episodes/${pathSegments[2]}`,
            });
          } else if (pathSegments.includes("subtitles")) {
            breadcrumbs.push({
              label: "字幕管理",
              href: `/admin/episodes/${pathSegments[2]}`,
            });
          }
          break;

        case "users":
          breadcrumbs.push({ label: "用户管理", href: "/admin/users" });
          break;

        case "tag-groups":
          breadcrumbs.push({
            label: "标签分组",
            href: "/admin/tag-groups",
          });
          if (pathSegments.includes("create")) {
            breadcrumbs.push({
              label: "创建标签分组",
              href: "/admin/tag-groups/create",
            });
          }
          break;

        case "tags":
          breadcrumbs.push({ label: "标签管理", href: "/admin/tags" });
          if (pathSegments.includes("create")) {
            breadcrumbs.push({
              label: "创建标签",
              href: "/admin/tags/create",
            });
          }
          break;
      }
    }

    // 设置最后一个面包屑为active状态
    if (breadcrumbs.length > 0) {
      // 创建新的面包屑数组，最后一个元素设置为active
      const newBreadcrumbs = breadcrumbs.map((breadcrumb, index) => {
        if (index === breadcrumbs.length - 1) {
          return {
            label: breadcrumb.label,
            href: breadcrumb.href,
            active: true,
          };
        }
        return breadcrumb;
      });
      return newBreadcrumbs;
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div>
      {/* 桌面浏览器下Header */}
      <div className="hidden sm:block fixed h-16 top-0 lg:left-[260px] lg:w-[calc(100%-260px)] shadow-xs border-b border-base-300 bg-base-100 z-50">
        <div className="flex items-center h-full pl-6 pt-6">
          {breadcrumbs.length > 0 && <Breadcrumbs breadcrumbs={breadcrumbs} />}
        </div>
      </div>
    </div>
  );
}
