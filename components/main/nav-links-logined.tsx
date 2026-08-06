// components/main/nav-links-logined.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import { BookmarkSquareIcon as BookmarkSquareOutlineIcon } from "@heroicons/react/24/outline";
import { BookmarkSquareIcon as BookmarkSquareSolidIcon } from "@heroicons/react/24/solid";

interface NavLinkItem {
  name: string;
  href: string;
  iconName?: string;
  mobileHide?: boolean;
  isBookmarkSquare?: boolean;
}

const links: NavLinkItem[] = [
  { name: "生词本", href: "/library/vocabulary", iconName: "translate" },
  {
    name: "发音弱项本",
    href: "/library/pronunciation",
    iconName: "mic",
    mobileHide: true,
  },
  {
    name: "学习路径",
    href: "/library/learning-paths",
    iconName: "school",
    mobileHide: true,
  },
  {
    name: "收听历史",
    href: "/library/history",
    iconName: "history",
    mobileHide: true,
  },
  {
    name: "我的收藏",
    href: "/library/favorites",
    isBookmarkSquare: true,
    mobileHide: true,
  },
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

        const isActive = pathname === link.href;

        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={closeDrawer}
            className={clsx(
              link.mobileHide ? "hidden md:flex" : "flex",
              "items-center gap-4 px-4 py-3 text-sm transition-all duration-200 scale-95 active:scale-90 transition-transform",
              {
                "font-bold text-primary-700 border-r-4 border-primary-600 bg-primary-50/50":
                  isActive,
                "font-medium text-ink-500 rounded-[1rem] hover:text-primary-500 hover:bg-primary-50/50":
                  !isActive,
              },
            )}
          >
            {link.isBookmarkSquare ? (
              isActive ? (
                <BookmarkSquareSolidIcon
                  className="w-6 h-6"
                  style={{ color: "#1A6349" }}
                />
              ) : (
                <BookmarkSquareOutlineIcon
                  className="w-6 h-6"
                  style={{ color: "#A79E8A" }}
                />
              )
            ) : (
              <span
                className="material-symbols-outlined"
                translate="no"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  color: isActive ? "#1A6349" : "#A79E8A",
                }}
              >
                {link.iconName}
              </span>
            )}
            <span className="">{link.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
