import { create } from "zustand";

export interface NotificationItemType {
  notificationid: number;
  notificationText: string | null;
  notificationAt: string | null;
  isRead: boolean;
  type: string;
  targetUrl: string | null;
}

export interface NotificationState {
  unreadCount: number;
  notifications: NotificationItemType[];
  isInitialized: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  initPolling: () => void;
  stopPolling: () => void;
}

let pollingInterval: NodeJS.Timeout | null = null;
let eventListenerAdded = false;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  notifications: [],
  isInitialized: false,

  fetchNotifications: async () => {
    try {
      const res = await fetch("/api/notification/list");
      if (!res.ok) return;
      const json = await res.json();
      set({
        unreadCount: json.unreadCount || 0,
        notifications: json.notifications || [],
        isInitialized: true,
      });
    } catch {
      // 忽略错误
    }
  },

  initPolling: () => {
    const { fetchNotifications } = get();

    // 初次拉取
    fetchNotifications();

    if (!pollingInterval) {
      pollingInterval = setInterval(() => {
        fetchNotifications();
      }, 60_000);
    }

    if (!eventListenerAdded && typeof window !== "undefined") {
      window.addEventListener("notifications_updated", fetchNotifications);
      eventListenerAdded = true;
    }
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    if (eventListenerAdded && typeof window !== "undefined") {
      const { fetchNotifications } = get();
      window.removeEventListener("notifications_updated", fetchNotifications);
      eventListenerAdded = false;
    }
  },

  markAsRead: async (id: number) => {
    try {
      await fetch("/api/notification/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });

      const { notifications } = get();
      const updated = notifications.map((n) =>
        n.notificationid === id ? { ...n, isRead: true } : n,
      );
      const unreadCount = updated.filter((n) => !n.isRead).length;

      set({ unreadCount, notifications: updated });
      window.dispatchEvent(new Event("notifications_updated"));
    } catch (e) {
      console.error(e);
    }
  },

  markAllAsRead: async () => {
    try {
      await fetch("/api/notification/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      const { notifications } = get();
      set({
        unreadCount: 0,
        notifications: notifications.map((n) => ({ ...n, isRead: true })),
      });
      window.dispatchEvent(new Event("notifications_updated"));
    } catch (e) {
      console.error(e);
    }
  },
}));
