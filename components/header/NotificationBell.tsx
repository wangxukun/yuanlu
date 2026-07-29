"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BellIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useNotificationStore } from "@/store/notification-store";

interface Notification {
  notificationid: number;
  notificationText: string | null;
  notificationAt: string | null;
  isRead: boolean;
  type: string;
  targetUrl: string | null;
}

/** 通知类型对应的中文标签 */
const TYPE_LABEL: Record<string, string> = {
  COMMENT: "评论",
  LIKE: "点赞",
  ACHIEVEMENT: "成就",
  SYSTEM: "系统",
  REPLY: "回复",
  EPISODE_UPDATE: "更新",
  STUDY: "学习",
};

export default function NotificationBell() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const notifications = useNotificationStore((s) => s.notifications);
  const initPolling = useNotificationStore((s) => s.initPolling);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 初始加载 + 轮询及全局事件监听
  useEffect(() => {
    initPolling();
  }, [initPolling]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    await markAllAsRead();
    setLoading(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 铃铛按钮 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800 rounded-full transition-colors text-ink-400 relative"
        aria-label="通知"
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-2 w-2 items-center justify-center rounded-full bg-error-500 ring-2 ring-white dark:ring-ink-900"></span>
        )}
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="fixed inset-x-4 top-[90px] mx-auto w-auto max-w-sm z-[100] rounded-[1.5rem] shadow-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 overflow-hidden sm:absolute sm:inset-auto sm:top-full sm:-right-4 sm:w-80 sm:mt-2 sm:max-w-none">
          {/* 面板头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ink-50 dark:border-ink-800">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="font-bold text-sm text-ink-800 dark:text-ink-100 hover:text-primary-600 transition-colors flex items-center"
            >
              通知
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-[10px]">
                  {unreadCount} 条未读
                </span>
              )}
            </Link>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
              >
                全部已读
              </button>
            )}
          </div>

          {/* 通知列表 */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-base-200">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-base-content/40 gap-2">
                <BellIcon className="w-10 h-10" />
                <p className="text-sm">暂无通知</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.notificationid}
                  notification={n}
                  onRead={markAsRead}
                  onClose={() => setOpen(false)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 单条通知项 */
function NotificationItem({
  notification: n,
  onRead,
  onClose,
}: {
  notification: Notification;
  onRead: (id: number) => void;
  onClose: () => void;
}) {
  const handleClick = () => {
    if (!n.isRead) onRead(n.notificationid);
    onClose();
  };

  const timeAgo = n.notificationAt
    ? formatDistanceToNow(new Date(n.notificationAt), {
        addSuffix: true,
        locale: zhCN,
      })
    : "";

  const content = (
    <div
      className={`flex items-start gap-4 px-6 py-4 transition-colors cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-800/50 ${
        n.isRead ? "opacity-60" : "bg-primary-50/30 dark:bg-primary-900/10"
      }`}
      onClick={handleClick}
    >
      {/* 未读圆点 */}
      <div className="mt-2 flex-shrink-0">
        {!n.isRead && (
          <div className="w-1.5 h-1.5 rounded-full bg-primary-600 shadow-[0_0_8px_rgba(31,122,92,0.5)]" />
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink-700 dark:text-ink-200 leading-snug line-clamp-2 font-medium">
          {n.notificationText}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="px-2 py-0.5 bg-ink-100 dark:bg-ink-800 text-[10px] font-bold text-ink-500 rounded-md uppercase tracking-wider">
            {TYPE_LABEL[n.type] ?? n.type}
          </span>
          <span className="text-[10px] font-medium text-ink-400">
            {timeAgo}
          </span>
        </div>
      </div>
    </div>
  );

  return n.targetUrl ? (
    <Link href={n.targetUrl}>{content}</Link>
  ) : (
    <>{content}</>
  );
}
