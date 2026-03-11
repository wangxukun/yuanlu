/**
 * Mapper 层 = 将 Prisma 返回的原始数据转换为前端所需的 DTO 结构
 */
import { notifications } from "@prisma/client";

export interface NotificationDto {
  notificationid: number;
  notificationText: string | null;
  notificationAt: Date | null;
  isRead: boolean;
  type: string;
  targetUrl: string | null;
}

export interface NotificationListDto {
  unreadCount: number;
  notifications: NotificationDto[];
}

export const NotificationMapper = {
  /**
   * 将单条 Prisma 通知记录转换为前端 DTO
   */
  toDto(notification: notifications): NotificationDto {
    return {
      notificationid: notification.notificationid,
      notificationText: notification.notificationText,
      notificationAt: notification.notificationAt,
      isRead: notification.isRead ?? false,
      type: notification.type ?? "SYSTEM",
      targetUrl: notification.targetUrl,
    };
  },

  /**
   * 将通知列表 + 未读数转换为完整列表 DTO
   */
  toListDto(
    notifications: notifications[],
    unreadCount: number,
  ): NotificationListDto {
    return {
      unreadCount,
      notifications: notifications.map(NotificationMapper.toDto),
    };
  },
};
