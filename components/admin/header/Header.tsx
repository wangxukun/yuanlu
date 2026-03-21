"use client";

import Breadcrumbs from "@/components/admin/breadcrumbs";
import React from "react";
import { usePathname } from "next/navigation";
import { Bars3Icon } from "@heroicons/react/24/outline";
import Link from "next/link";
import PhoneAcmeLogo from "@/components/phone-acme-logo";

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

        case "notifications":
          breadcrumbs.push({ label: "通知管理", href: "/admin/notifications" });
          break;

        case "logs":
          breadcrumbs.push({ label: "日志管理", href: "/admin/logs" });
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
    <div className="shrink-0 sticky top-0 z-30 flex h-16 w-full items-center gap-4 border-b border-base-300 bg-base-100/95 backdrop-blur px-4 shadow-sm sm:px-6">
      {/* 汉堡按钮（仅在小于 lg 的屏幕显示） */}
      <label
        htmlFor="admin-drawer"
        aria-label="open sidebar"
        className="btn btn-square btn-ghost btn-sm drawer-button lg:hidden"
      >
        <Bars3Icon className="h-6 w-6" />
      </label>

      {/* 移动端 Logo */}
      <div className="lg:hidden flex items-center shrink-0 pr-2">
        <Link href="/" title="返回首页">
          <PhoneAcmeLogo />
        </Link>
      </div>

      {/* 面包屑区域 */}
      <div className="flex-1 flex items-center h-full overflow-x-auto whitespace-nowrap scrollbar-hide">
        {breadcrumbs.length > 0 && <Breadcrumbs breadcrumbs={breadcrumbs} />}
      </div>
    </div>
  );
}
