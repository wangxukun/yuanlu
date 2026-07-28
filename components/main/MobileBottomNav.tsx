// components/main/MobileBottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "首页", href: "/home", icon: "home" },
  { name: "发现", href: "/discover", icon: "explore" },
  { name: "生词本", href: "/library/vocabulary", icon: "translate" },
  { name: "我的", href: "/auth/mine", icon: "person" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      id="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-[190] md:hidden"
    >
      {/* Top border line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-ink-200/80 dark:bg-ink-700/80" />

      {/* Glass background */}
      <div className="bg-white/90 dark:bg-ink-900/90 backdrop-blur-xl pb-safe">
        <div className="flex items-center justify-around h-[var(--bottom-nav-height)]">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href || pathname.startsWith(tab.href + "/");

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-200 active:scale-90 ${
                  isActive
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-ink-400 dark:text-ink-500"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${
                    isActive ? "scale-110" : "scale-100"
                  }`}
                  style={{
                    fontVariationSettings: isActive
                      ? "'FILL' 1, 'wght' 600"
                      : "'FILL' 0, 'wght' 400",
                  }}
                >
                  {tab.icon}
                </span>
                <span
                  className={`text-[10px] leading-none font-semibold transition-all duration-200 ${
                    isActive ? "opacity-100" : "opacity-70"
                  }`}
                >
                  {tab.name}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+4px)] w-1 h-1 rounded-full bg-primary-600 dark:bg-primary-400" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
