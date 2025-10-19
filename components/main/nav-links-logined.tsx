"use client";

import {
  GiftIcon,
  RectangleStackIcon,
  TvIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSession } from "next-auth/react"; // 客户端组件获取会话

const links = [
  { name: "节目", href: "/library/podcasts", icon: TvIcon },
  { name: "剧集", href: "/library/episodes", icon: RectangleStackIcon },
  { name: "订阅", href: "/library/premiums", icon: GiftIcon },
];

export default function NavLinksLogined() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="flex flex-col">
      {links.map((link) => {
        //  隐藏非PREMIUM用户
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
                "bg-gray-200 text-gray-600": pathname === link.href,
              },
            )}
          >
            <LinkIcon className="w-5 text-purple-500" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </div>
  );
}
