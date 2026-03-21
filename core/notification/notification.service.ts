/**
 * Service 层 = 整合 Repository + Mapper，提供清晰的业务功能
 * 负责权限校验、业务流程、错误处理
 */
import { notificationRepository } from "./notification.repository";
import { NotificationMapper, NotificationListDto } from "./notification.mapper";
import { NotificationTypeValue, NotificationType } from "./notification.entity";

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
   * 删除单条通知
   * 包含权限校验：只有所有者可以删除
   */
  async deleteNotification(
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

    await notificationRepository.delete(notificationId);
    return { success: true };
  },

  /**
   * 批量删除当前用户的通知
   */
  async deleteMultipleNotifications(
    userId: string,
    notificationIds?: number[],
  ): Promise<{ success: boolean; count: number }> {
    // 权限校验由 Repository 中的 where: { userid: userId } 保证
    const result = await notificationRepository.deleteMany(
      userId,
      notificationIds,
    );
    return { success: true, count: result.count };
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
    referenceId?: string;
    referenceType?: string;
  }): Promise<void> {
    await notificationRepository.create(data);
  },

  /**
   * 触发评论回复通知
   */
  async triggerReplyNotification(
    targetUserId: string,
    replyUserName: string,
    targetUrl: string,
    commentId: string,
  ): Promise<void> {
    await this.createNotification({
      userid: targetUserId,
      type: NotificationType.REPLY,
      notificationText: `用户 ${replyUserName} 回复了你的评论`,
      targetUrl,
      referenceId: commentId,
      referenceType: "COMMENT",
    });
  },

  /**
   * 触发剧集发布通知（群发给所有收藏该播客的用户）
   */
  async triggerEpisodePublishEvent(
    userIds: string[],
    podcastTitle: string,
    episodeTitle: string,
    targetUrl: string,
    episodeId: string,
  ): Promise<void> {
    if (userIds.length === 0) return;

    const notifications = userIds
      .filter((id) => !!id)
      .map((userid) => ({
        userid,
        type: NotificationType.EPISODE_UPDATE,
        notificationText: `你关注的播客「${podcastTitle}」更新了新单集「${episodeTitle}」`,
        targetUrl,
        referenceId: episodeId,
        referenceType: "EPISODE",
      }));

    if (notifications.length === 0) return;

    await notificationRepository.createMany(notifications);
  },

  /**
   * 触发系统全局通知（群发给指定用户或所有人）
   */
  async triggerSystemNotification(
    userIds: string[],
    message: string,
    targetUrl?: string,
  ): Promise<void> {
    if (userIds.length === 0) return;

    console.log(
      `[NotificationService] Triggering system notification for ${userIds.length} users. Message preview: ${message.slice(0, 20)}...`,
    );

    const notifications = userIds
      .filter((id) => !!id)
      .map((userid) => ({
        userid,
        type: NotificationType.SYSTEM,
        notificationText: message,
        targetUrl,
      }));

    if (notifications.length === 0) return;

    await notificationRepository.createMany(notifications);
  },

  /**
   * 触发成就解锁通知
   */
  async triggerAchievementNotification(
    userId: string,
    achievementName: string,
    targetUrl: string,
    achievementId: string,
  ): Promise<void> {
    await this.createNotification({
      userid: userId,
      type: NotificationType.ACHIEVEMENT,
      notificationText: `恭喜解锁新成就：「${achievementName}」！`,
      targetUrl,
      referenceId: achievementId,
      referenceType: "ACHIEVEMENT",
    });
  },

  /**
   * 触发学习提醒（如复习生词）
   */
  async triggerStudyReminder(
    userId: string,
    message: string,
    targetUrl: string,
  ): Promise<void> {
    await this.createNotification({
      userid: userId,
      type: NotificationType.STUDY,
      notificationText: message,
      targetUrl,
    });
  },
};
