"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotificationStore } from "@/store/notification-store";

/**
 * 主页顶部悬浮铃铛：移动端消息通知入口（带未读红点）。
 * fixed 悬浮于右上角，置于侧边抽屉(z-100)之下、页面内容之上。
 */
export default function HomeNotificationBell() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <Link
      href="/notifications"
      aria-label={unreadCount > 0 ? `${unreadCount} 条未读消息` : "消息通知"}
      className="fixed top-3.5 right-4 z-[90] md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white/85 dark:bg-ink-900/85 backdrop-blur-xl border border-ink-200/70 dark:border-ink-800 text-ink-600 dark:text-ink-300 shadow-sm active:scale-90 transition-transform"
    >
      <Bell className="w-5 h-5" strokeWidth={1.75} aria-hidden />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-error-500 text-white text-[10px] font-bold leading-none ring-2 ring-white dark:ring-ink-900">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
