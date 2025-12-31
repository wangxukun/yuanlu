"use client";

import {
  BookOpenIcon, // 生词本图标
  ClockIcon, // 历史记录图标
  HeartIcon, // 收藏图标
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSession } from "next-auth/react";

const links = [
  // [新增] 英语学习最核心的功能
  { name: "生词本", href: "/library/vocabulary", icon: BookOpenIcon },
  // [新增] 方便回溯复习
  { name: "收听历史", href: "/library/history", icon: ClockIcon },
  // 将“剧集”改为“收藏”，语意更明确
  { name: "我的收藏", href: "/library/favorites", icon: HeartIcon },
];

export default function NavLinksLogined() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="flex flex-col">
      {links.map((link) => {
        // 权限控制逻辑保持不变
        if (
          "/library/premiums" === link.href &&
          session &&
          session.user?.role !== "PREMIUM" &&
          session?.user.role !== "ADMIN"
        ) {
          return null;
        }
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              "flex ml-6 mr-6 h-10 grow items-center justify-center gap-2 rounded-md p-3 text-sm font-medium md:flex-none md:justify-start md:p-2 md:px-3",
              {
                "bg-base-200 text-base-content": pathname === link.href,
                "text-base-content/70 hover:bg-base-200/50 hover:text-base-content":
                  pathname !== link.href,
              },
            )}
          >
            <LinkIcon className="w-5 text-primary" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </div>
  );
}
