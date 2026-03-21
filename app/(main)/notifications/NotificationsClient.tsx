"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { TrashIcon, BellIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { NotificationListDto } from "@/core/notification/notification.mapper";

const TABS = [
  { id: "ALL", label: "全部" },
  { id: "COMMENT", label: "评论" },
  { id: "REPLY", label: "回复" },
  { id: "LIKE", label: "点赞" },
  { id: "SYSTEM", label: "系统" },
  { id: "EPISODE_UPDATE", label: "更新" },
];

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
const TYPE_LABEL: Record<string, string> = {
  COMMENT: "评论",
  LIKE: "点赞",
  ACHIEVEMENT: "成就",
  SYSTEM: "系统",
  REPLY: "回复",
  EPISODE_UPDATE: "更新",
  STUDY: "学习",
};

export default function NotificationsClient({
  initialData,
}: {
  initialData: NotificationListDto;
}) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayedNotifications = data.notifications.filter(
    (n) => activeTab === "ALL" || n.type === activeTab,
  );

  useEffect(() => {
    const handleUpdate = async () => {
      try {
        const res = await fetch("/api/notification/list");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error("Failed to fetch notifications on update", e);
      }
    };
    window.addEventListener("notifications_updated", handleUpdate);
    return () =>
      window.removeEventListener("notifications_updated", handleUpdate);
  }, []);

  const handleRead = async (id: number) => {
    const item = data.notifications.find((n) => n.notificationid === id);
    if (!item || item.isRead) return;

    // 乐观更新
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.notificationid === id ? { ...n, isRead: true } : n,
      ),
    }));

    try {
      await fetch("/api/notification/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      window.dispatchEvent(new Event("notifications_updated"));
    } catch (error) {
      console.error(error);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedIds.length === displayedNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedNotifications.map((n) => n.notificationid));
    }
  };

  const handleDelete = async (ids: number[]) => {
    if (ids.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/notification/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: ids }),
      });
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          notifications: prev.notifications.filter(
            (n) => !ids.includes(n.notificationid),
          ),
        }));
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        window.dispatchEvent(new Event("notifications_updated"));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-base-100 shadow-sm rounded-xl border border-base-200 overflow-hidden">
      {/* 选项卡 / 过滤区 */}
      <div className="border-b border-base-200 overflow-x-auto">
        <div className="flex px-4 py-2 space-x-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedIds([]);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-content"
                  : "text-base-content/70 hover:bg-base-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 操作栏 */}
      {displayedNotifications.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 bg-base-50 border-b border-base-200">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={
                selectedIds.length > 0 &&
                selectedIds.length === displayedNotifications.length
              }
              onChange={selectAll}
            />
            <span className="text-sm text-base-content/70">
              已选 {selectedIds.length} 项
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleDelete(selectedIds)}
              disabled={selectedIds.length === 0 || isDeleting}
              className="btn btn-sm btn-outline btn-error gap-2 disabled:opacity-50"
            >
              <TrashIcon className="w-4 h-4" />
              删除选中
            </button>
          </div>
        </div>
      )}

      {/* 通知列表 */}
      <div className="divide-y divide-base-200 flex flex-col">
        {displayedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-base-content/40">
            <BellIcon className="w-16 h-16 mb-4 opacity-50" />
            <p>暂无{activeTab !== "ALL" ? "此类" : ""}通知记录</p>
          </div>
        ) : (
          displayedNotifications.map((n) => {
            const timeAgo = n.notificationAt
              ? formatDistanceToNow(new Date(n.notificationAt), {
                  addSuffix: true,
                  locale: zhCN,
                })
              : "";

            return (
              <div
                key={n.notificationid}
                className={`flex items-start gap-4 p-6 transition-colors hover:bg-base-200/50 ${
                  n.isRead ? "opacity-75" : "bg-primary/5"
                }`}
              >
                <div className="pt-1">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedIds.includes(n.notificationid)}
                    onChange={() => toggleSelect(n.notificationid)}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className={`badge badge-sm ${
                        TYPE_BADGE[n.type] || "badge-neutral"
                      }`}
                    >
                      {TYPE_LABEL[n.type] || n.type}
                    </span>
                    <span className="text-sm text-base-content/50">
                      {timeAgo}
                    </span>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-error" />
                    )}
                  </div>

                  {n.targetUrl ? (
                    <Link
                      href={n.targetUrl}
                      onClick={() => handleRead(n.notificationid)}
                      className="text-base text-base-content font-medium hover:text-primary transition-colors block leading-relaxed"
                    >
                      {n.notificationText}
                    </Link>
                  ) : (
                    <p
                      onClick={() => handleRead(n.notificationid)}
                      className="text-base text-base-content font-medium leading-relaxed cursor-pointer hover:text-primary transition-colors"
                    >
                      {n.notificationText}
                    </p>
                  )}
                </div>

                {/* 行内单向删除按钮 */}
                <button
                  onClick={() => handleDelete([n.notificationid])}
                  disabled={isDeleting}
                  className="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-error hover:bg-error/10"
                  aria-label="删除"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
