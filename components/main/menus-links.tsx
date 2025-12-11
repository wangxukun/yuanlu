"use client";

import { HomeIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

// 保持与 Desktop 一致
const links = [
  { name: "主页", href: "/home", icon: HomeIcon },
  { name: "发现", href: "/browse", icon: Squares2X2Icon },
];

export default function MenusLinks({
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
