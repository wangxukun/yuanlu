"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookA, Mic, TextQuote, type LucideIcon } from "lucide-react";

const TABS: { name: string; href: string; icon: LucideIcon }[] = [
  { name: "生词本", href: "/review/vocabulary", icon: BookA },
  { name: "句子本", href: "/review/sentences", icon: TextQuote },
  { name: "发音弱项本", href: "/review/pronunciation", icon: Mic },
];

/** 触发左右滑动切页的最小横向位移（px） */
const SWIPE_THRESHOLD = 80;

/** 起点位于可横向滚动的容器（标签 pills、横滑列表）内时禁用滑动切页，避免手势冲突 */
function inHorizontalScroller(el: Element | null, root: Element | null) {
  let cur = el;
  while (cur && cur !== root) {
    const style = window.getComputedStyle(cur);
    if (
      /(auto|scroll)/.test(style.overflowX) &&
      cur.scrollWidth > cur.clientWidth + 4
    ) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

/**
 * 复习中心顶部横向选项卡：生词本 / 句子本 / 发音弱项本。
 * 移动端 Tab 栏吸附在页面顶部（桌面端跟随滚动），内容区支持左右滑动切换；
 * 三个子模块均为路由段（layout 不重挂载），Tab 间切换不中断全局音频。
 */
export default function ReviewTabs({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number; skip: boolean } | null>(
    null,
  );

  const activeIndex = TABS.findIndex(
    (t) => pathname === t.href || pathname.startsWith(t.href + "/"),
  );

  // 仅在 Tab 根路径启用滑动切页；子页面（刷句复习/影子跟读/闯关等）内
  // 有横滑卡片与录音手势，滑动切页会与之冲突
  const isTabRoot = activeIndex >= 0 && pathname === TABS[activeIndex].href;

  const goToTab = (index: number) => {
    const next = TABS[index];
    if (next) router.push(next.href);
  };

  return (
    <div>
      <nav
        aria-label="复习资源"
        className="sticky top-0 z-40 md:static bg-ink-50/95 dark:bg-ink-950/95 backdrop-blur-xl border-b border-ink-200/70 dark:border-ink-800/70"
      >
        <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 flex items-stretch overflow-x-auto scrollbar-hide">
          {TABS.map((tab, index) => {
            const isActive = index === activeIndex;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex-1 flex items-center justify-center gap-1.5 h-12 min-w-fit px-3 whitespace-nowrap text-sm font-semibold transition-colors ${
                  isActive
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
                }`}
              >
                <tab.icon
                  aria-hidden
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className="w-[18px] h-[18px] shrink-0"
                />
                <span>{tab.name}</span>
                {isActive && (
                  <motion.span
                    layoutId="review-tab-indicator"
                    className="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-primary-600 dark:bg-primary-400"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 内容区：左右滑动切换相邻 Tab */}
      <div
        ref={contentRef}
        onTouchStart={(e) => {
          if (e.touches.length !== 1) {
            touchStart.current = null;
            return;
          }
          const t = e.touches[0];
          touchStart.current = {
            x: t.clientX,
            y: t.clientY,
            skip: inHorizontalScroller(e.target as Element, contentRef.current),
          };
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start || start.skip || !isTabRoot) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (
            Math.abs(dx) > SWIPE_THRESHOLD &&
            Math.abs(dx) > Math.abs(dy) * 1.5
          ) {
            goToTab(activeIndex + (dx < 0 ? 1 : -1));
          }
        }}
        onTouchCancel={() => {
          touchStart.current = null;
        }}
      >
        {/* 仅做淡入：transform 动画会破坏子页面内 sticky 控件的吸附 */}
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
