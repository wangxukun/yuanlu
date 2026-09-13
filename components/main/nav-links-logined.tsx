// components/main/nav-links-logined.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import {
  BookA,
  Bookmark,
  History,
  Mic,
  Route,
  TextQuote,
  type LucideIcon,
} from "lucide-react";

interface NavLinkItem {
  name: string;
  href: string;
  icon: LucideIcon;
  mobileHide?: boolean;
}

const links: NavLinkItem[] = [
  { name: "生词本", href: "/library/vocabulary", icon: BookA },
  { name: "句子本", href: "/library/sentences", icon: TextQuote },
  {
    name: "发音弱项本",
    href: "/library/pronunciation",
    icon: Mic,
    mobileHide: true,
  },
  {
    name: "学习路径",
    href: "/library/learning-paths",
    icon: Route,
    mobileHide: true,
  },
  {
    name: "收听历史",
    href: "/library/history",
    icon: History,
    mobileHide: true,
  },
  {
    name: "我的收藏",
    href: "/library/favorites",
    icon: Bookmark,
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
            <link.icon
              aria-hidden
              strokeWidth={isActive ? 2.25 : 1.75}
              className={clsx(
                "w-5 h-5 shrink-0",
                isActive
                  ? "text-primary-700 dark:text-primary-300"
                  : "text-ink-400 dark:text-ink-500",
              )}
            />
            <span className="">{link.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
