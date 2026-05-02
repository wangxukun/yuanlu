"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { BellIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Notification {
  notificationid: number;
  notificationText: string | null;
  notificationAt: string | null;
  isRead: boolean;
  type: string;
  targetUrl: string | null;
}

interface NotificationListResponse {
  unreadCount: number;
  notifications: Notification[];
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
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /** 拉取通知列表 */
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notification/list");
      if (!res.ok) return;
      const json: NotificationListResponse = await res.json();
      setData(json);
    } catch {
      // 静默失败，不影响主界面
    }
  }, []);

  // 初始加载 + 轮询（每 60 秒刷新一次）及全局事件监听
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 60_000);

    window.addEventListener("notifications_updated", fetchNotifications);

    return () => {
      clearInterval(timer);
      window.removeEventListener("notifications_updated", fetchNotifications);
    };
  }, [fetchNotifications]);

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

  /** 标记单条已读 */
  const markAsRead = async (id: number) => {
    await fetch("/api/notification/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setData((prev) => {
      if (!prev) return prev;
      const updated = prev.notifications.map((n) =>
        n.notificationid === id ? { ...n, isRead: true } : n,
      );
      const unreadCount = updated.filter((n) => !n.isRead).length;
      return { unreadCount, notifications: updated };
    });
    window.dispatchEvent(new Event("notifications_updated"));
  };

  /** 全部标记已读 */
  const markAllAsRead = async () => {
    setLoading(true);
    await fetch("/api/notification/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setData((prev) => {
      if (!prev) return prev;
      return {
        unreadCount: 0,
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
      };
    });
    setLoading(false);
    window.dispatchEvent(new Event("notifications_updated"));
  };

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 铃铛按钮 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 relative"
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
          <span className="absolute top-2 right-2 flex h-2 w-2 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>
        )}
      </button>

      {/* 下拉面板 */}
      {open && (
        <div
          className="fixed inset-x-4 top-[90px] mx-auto w-auto max-w-sm z-[100] rounded-[1.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden sm:absolute sm:inset-auto sm:top-full sm:-right-4 sm:w-80 sm:mt-2 sm:max-w-none"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* 面板头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50 dark:border-slate-800">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="font-bold text-sm text-slate-800 dark:text-slate-100 hover:text-indigo-600 transition-colors flex items-center"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              通知
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px]">
                  {unreadCount} 条未读
                </span>
              )}
            </Link>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
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
      className={`flex items-start gap-4 px-6 py-4 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
        n.isRead ? "opacity-60" : "bg-indigo-50/30 dark:bg-indigo-900/10"
      }`}
      onClick={handleClick}
    >
      {/* 未读圆点 */}
      <div className="mt-2 flex-shrink-0">
        {!n.isRead && (
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug line-clamp-2 font-medium">
          {n.notificationText}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 rounded-md uppercase tracking-wider">
            {TYPE_LABEL[n.type] ?? n.type}
          </span>
          <span className="text-[10px] font-medium text-slate-400">
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
