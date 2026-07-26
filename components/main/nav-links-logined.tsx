// components/main/nav-links-logined.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSession } from "next-auth/react";

const links = [
  { name: "学习路径", href: "/library/learning-paths", iconName: "school" },
  { name: "生词本", href: "/library/vocabulary", iconName: "translate" },
  { name: "收听历史", href: "/library/history", iconName: "history" },
  { name: "我的收藏", href: "/library/favorites", iconName: "favorite" },
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
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={closeDrawer}
            className={clsx(
              "flex items-center gap-4 px-4 py-3 text-sm transition-all duration-200 scale-95 active:scale-90 transition-transform",
              {
                "font-bold text-primary-700 border-r-4 border-primary-600 bg-primary-50/50":
                  pathname === link.href,
                "font-medium text-ink-500 rounded-[1rem] hover:text-primary-500 hover:bg-primary-50/50":
                  pathname !== link.href,
              },
            )}
          >
            <span
              className="material-symbols-outlined"
              translate="no"
              style={{
                fontVariationSettings:
                  pathname === link.href ? "'FILL' 1" : "'FILL' 0",
                color: pathname === link.href ? "#1A6349" : "#A79E8A",
              }}
            >
              {link.iconName}
            </span>
            <span className="">{link.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
