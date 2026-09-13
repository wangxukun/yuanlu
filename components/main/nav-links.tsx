// components/main/nav-links.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Compass, Home, type LucideIcon } from "lucide-react";

const links: { name: string; href: string; icon: LucideIcon }[] = [
  { name: "主页", href: "/home", icon: Home },
  { name: "发现", href: "/discover", icon: Compass },
];

export default function NavLinks() {
  const pathname = usePathname();

  const closeDrawer = () => {
    const drawer = document.getElementById("main-drawer") as HTMLInputElement;
    if (drawer) drawer.checked = false;
  };

  return (
    <div className="flex flex-col space-y-1">
      {links.map((link) => {
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={closeDrawer}
            className={clsx(
              "flex items-center gap-4 px-4 py-3 text-sm transition-all duration-200 scale-95 active:scale-90 transition-transform",
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
