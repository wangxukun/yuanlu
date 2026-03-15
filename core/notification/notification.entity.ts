/**
 * 通知实体类型定义
 * 对应 Prisma schema 中的 notifications 模型
 */
export interface NotificationEntity {
  notificationid: number;
  userid: string | null;
  notificationText: string | null;
  notificationAt: Date | null;
  isRead: boolean | null;
  type: string | null;
  targetUrl: string | null;
  referenceId: string | null;
  referenceType: string | null;
}

/**
 * 通知类型枚举
 * 统一管理所有通知类型常量，避免硬编码字符串
 */
export const NotificationType = {
  /** 系统通知（默认） */
  SYSTEM: "SYSTEM",
  /** 有人回复了你的评论 */
  COMMENT: "COMMENT",
  /** 有人点赞了你的评论 */
  LIKE: "LIKE",
  /** 获得新成就 */
  ACHIEVEMENT: "ACHIEVEMENT",
  /** 评论回复通知 */
  REPLY: "REPLY",
  /** 剧集更新通知 */
  EPISODE_UPDATE: "EPISODE_UPDATE",
  /** 学习提醒（如复习生词） */
  STUDY: "STUDY",
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];
