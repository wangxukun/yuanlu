// components/main/nav-links-logined.tsx
"use client";

import {
  BookOpenIcon,
  ClockIcon,
  HeartIcon,
  MapIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSession } from "next-auth/react";

const links = [
  { name: "学习路径", href: "/library/learning-paths", icon: MapIcon },
  { name: "生词本", href: "/library/vocabulary", icon: BookOpenIcon },
  { name: "收听历史", href: "/library/history", icon: ClockIcon },
  { name: "我的收藏", href: "/library/favorites", icon: HeartIcon },
];

export default function NavLinksLogined() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const closeDrawer = () => {
    const drawer = document.getElementById("main-drawer") as HTMLInputElement;
    if (drawer) drawer.checked = false;
  };

  return (
    <div className="flex flex-col space-y-1">
      {links.map((link) => {
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
            onClick={closeDrawer}
            className={clsx(
              // 修复：移除 justify-center，统一使用 justify-start；增加 px-4 和 gap-3
              "flex mx-4 h-12 items-center justify-start gap-3 rounded-xl px-4 text-base font-medium transition-colors",
              {
                "bg-base-200 text-base-content": pathname === link.href,
                "text-base-content/70 hover:bg-base-200/50 hover:text-base-content":
                  pathname !== link.href,
              },
            )}
          >
            <LinkIcon className="w-6 text-primary" />
            {/* 修复：移除 hidden md:block，始终显示文字 */}
            <p className="block">{link.name}</p>
          </Link>
        );
      })}
    </div>
  );
}
