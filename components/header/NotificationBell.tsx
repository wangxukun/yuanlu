"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { BellAlertIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
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

/** 通知类型对应的标签颜色 */
const TYPE_BADGE: Record<string, string> = {
  COMMENT: "badge-info",
  LIKE: "badge-warning",
  ACHIEVEMENT: "badge-success",
  SYSTEM: "badge-neutral",
  REPLY: "badge-primary",
  EPISODE_UPDATE: "badge-accent",
  STUDY: "badge-secondary",
};

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

  // 初始加载 + 轮询（每 60 秒刷新一次）
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(timer);
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
  };

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 铃铛按钮 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost btn-circle btn-sm relative"
        aria-label="通知"
      >
        {unreadCount > 0 ? (
          <>
            <BellAlertIcon className="w-5 h-5 text-primary animate-[wiggle_1s_ease-in-out_infinite]" />
            {/* 红点未读数 */}
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-error-content text-[10px] font-bold leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        ) : (
          <BellIcon className="w-5 h-5" />
        )}
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="fixed inset-x-4 top-[calc(var(--header-height-mobile)+0.5rem)] mx-auto w-auto max-w-sm z-[100] rounded-2xl shadow-2xl border border-base-300 bg-base-100 overflow-hidden sm:absolute sm:inset-auto sm:top-full sm:-right-4 sm:w-80 sm:mt-2 sm:max-w-none">
          {/* 面板头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-200">
            <span className="font-semibold text-sm text-base-content">
              通知
              {unreadCount > 0 && (
                <span className="ml-2 badge badge-primary badge-sm">
                  {unreadCount} 条未读
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-primary hover:underline disabled:opacity-50"
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
      className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-base-200 ${
        n.isRead ? "opacity-60" : "bg-primary/5"
      }`}
      onClick={handleClick}
    >
      {/* 未读圆点 */}
      <div className="mt-1.5 flex-shrink-0">
        {n.isRead ? (
          <div className="w-2 h-2 rounded-full bg-base-300" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-primary" />
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-base-content leading-snug line-clamp-2">
          {n.notificationText}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`badge badge-xs ${TYPE_BADGE[n.type] ?? "badge-neutral"}`}
          >
            {TYPE_LABEL[n.type] ?? n.type}
          </span>
          <span className="text-xs text-base-content/40">{timeAgo}</span>
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
