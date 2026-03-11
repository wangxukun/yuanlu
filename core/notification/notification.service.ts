/**
 * Service 层 = 整合 Repository + Mapper，提供清晰的业务功能
 * 负责权限校验、业务流程、错误处理
 */
import { notificationRepository } from "./notification.repository";
import { NotificationMapper, NotificationListDto } from "./notification.mapper";
import { NotificationTypeValue } from "./notification.entity";

export const notificationService = {
  /**
   * 获取用户通知列表（含未读总数）
   */
  async getNotifications(userId: string): Promise<NotificationListDto> {
    const [notifications, unreadCount] = await Promise.all([
      notificationRepository.findByUserId(userId),
      notificationRepository.countUnread(userId),
    ]);
    return NotificationMapper.toListDto(notifications, unreadCount);
  },

  /**
   * 标记单条通知为已读
   * 包含权限校验：只有通知的所有者才能操作
   */
  async markAsRead(
    notificationId: number,
    userId: string,
  ): Promise<{ success: boolean }> {
    const notification = await notificationRepository.findById(notificationId);

    if (!notification) {
      throw new Error("NOTIFICATION_NOT_FOUND");
    }
    if (notification.userid !== userId) {
      throw new Error("FORBIDDEN");
    }

    await notificationRepository.markAsRead(notificationId);
    return { success: true };
  },

  /**
   * 批量标记当前用户所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    await notificationRepository.markAllAsRead(userId);
    return { success: true };
  },

  /**
   * 创建一条新通知
   * 供其他 Service（如 commentService）在触发事件时调用
   */
  async createNotification(data: {
    userid: string;
    notificationText: string;
    type?: NotificationTypeValue;
    targetUrl?: string;
  }): Promise<void> {
    await notificationRepository.create(data);
  },
};
