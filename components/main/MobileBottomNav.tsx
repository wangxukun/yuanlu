"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, Home, User, type LucideIcon } from "lucide-react";
import { useNotificationStore } from "@/store/notification-store";

interface TabConfig {
  name: string;
  href: string;
  icon: LucideIcon;
  /** 额外视为激活态的路径前缀（复习中心同时覆盖旧的 library 三本入口） */
  activePrefixes?: string[];
}

const tabs: TabConfig[] = [
  { name: "主页", href: "/home", icon: Home },
  { name: "发现", href: "/discover", icon: Compass },
  {
    name: "复习",
    href: "/review/vocabulary",
    icon: BookOpen,
    activePrefixes: [
      "/review",
      "/library/vocabulary",
      "/library/sentences",
      "/library/pronunciation",
    ],
  },
  { name: "我的", href: "/auth/mine", icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const initPolling = useNotificationStore((s) => s.initPolling);

  useEffect(() => {
    initPolling();
  }, [initPolling]);

  return (
    <nav
      id="mobile-bottom-nav"
      // 关键：padding 使用恒定的 --safe-bottom-max（safe-area-max-inset-bottom），
      // 而不是随滚动动态变化的 safe-area-inset-bottom。盒子尺寸恒定 + bottom:0
      // 时 Chrome 才能将底栏交给合成器逐帧锚定在视口底部，不随地址栏动画跳动。
      // 背景与 padding 必须在 fixed 元素自身，保证 padding 区域也被背景覆盖。
      className="fixed bottom-0 left-0 right-0 z-[190] md:hidden bg-white/90 dark:bg-ink-900/90 backdrop-blur-xl pb-[var(--safe-bottom-max)]"
    >
      {/* Top border line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-ink-200/80 dark:bg-ink-700/80" />

      <div className="flex items-center justify-around h-[var(--bottom-nav-height)]">
        {tabs.map((tab) => {
          const isActive = [tab.href, ...(tab.activePrefixes ?? [])].some(
            (prefix) =>
              pathname === prefix || pathname.startsWith(prefix + "/"),
          );

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-200 active:scale-90 relative ${
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-ink-400 dark:text-ink-500"
              }`}
            >
              <div className="relative">
                <tab.icon
                  aria-hidden
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className={`w-6 h-6 transition-transform duration-200 ${
                    isActive ? "scale-110" : "scale-100"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] leading-none font-semibold transition-all duration-200 ${
                  isActive ? "opacity-100" : "opacity-70"
                }`}
              >
                {tab.name}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute bottom-[calc(var(--safe-bottom-max)+4px)] w-1 h-1 rounded-full bg-primary-600 dark:bg-primary-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
