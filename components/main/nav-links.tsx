"use client";

import {
  HomeIcon,
  Squares2X2Icon,
  // NumberedListIcon, // 移除排行榜
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { name: "主页", href: "/home", icon: HomeIcon },
  {
    name: "发现", // 将“浏览”改为“发现”更符合探索语境
    href: "/browse",
    icon: Squares2X2Icon,
  },
  // 移除了排行榜，学习者更关注内容本身而非热度
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col">
      {links.map((link) => {
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
            <LinkIcon className="w-5 text-primary" />{" "}
            {/* 使用 text-primary 替代固定的 purple-500 */}
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </div>
  );
}
