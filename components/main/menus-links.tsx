"use client";

import {
  HomeIcon,
  NumberedListIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  { name: "主页", href: "/", icon: HomeIcon },
  {
    name: "浏览",
    href: "/browse",
    icon: Squares2X2Icon,
  },
  {
    name: "排行榜",
    href: "/charts",
    icon: NumberedListIcon,
  },
];

export default function MenusLinks({
  onLinkClick,
}: {
  onLinkClick: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col">
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onLinkClick}
            className={clsx(
              "flex ml-6 mr-6 h-[35] grow gap-2 rounded-md text-sm font-medium flex-none justify-start p-2 px-3",
              {
                "bg-gray-200 text-gray-600": pathname === link.href,
              },
            )}
          >
            <LinkIcon className="w-5 text-purple-500" />
            <p className="block">{link.name}</p>
          </Link>
        );
      })}
    </div>
  );
}
