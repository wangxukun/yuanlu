"use client";

import {
  BookOpenIcon,
  ClockIcon,
  TvIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

// 保持与 Desktop NavLinksLogined 一致
const links = [
  { name: "生词本", href: "/library/vocabulary", icon: BookOpenIcon },
  { name: "收听历史", href: "/library/history", icon: ClockIcon },
  { name: "我的订阅", href: "/library/podcasts", icon: TvIcon },
  { name: "我的收藏", href: "/library/favorites", icon: HeartIcon },
];

export default function MenusLinksLogined({
  onLinkClick,
}: {
  onLinkClick: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col space-y-1">
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onLinkClick}
            className={clsx(
              "flex mx-4 h-12 items-center gap-3 rounded-xl text-base font-medium px-4 transition-colors",
              {
                "bg-base-200 text-base-content": pathname === link.href,
                "text-base-content/70": pathname !== link.href,
              },
            )}
          >
            <LinkIcon className="w-6 text-primary" />
            <p className="block">{link.name}</p>
          </Link>
        );
      })}
    </div>
  );
}
