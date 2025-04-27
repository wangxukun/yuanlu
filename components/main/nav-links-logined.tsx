"use client";

import { RectangleStackIcon, TvIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  { name: "节目", href: "/library/podcasts", icon: TvIcon },
  { name: "剧集", href: "/library/episodes", icon: RectangleStackIcon },
];

export default function NavLinksLogined() {
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
              "flex ml-6 mr-6 h-[35] grow items-center justify-center gap-2 rounded-md p-3 text-sm font-medium md:flex-none md:justify-start md:p-2 md:px-3",
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
