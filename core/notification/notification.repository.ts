/**
 * Repository 层 = 只负责数据库的 CRUD 操作
 * 不包含任何业务逻辑，只和 Prisma 交互
 */
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const notificationRepository = {
  /**
   * 查询指定用户的所有通知，按时间倒序
   */
  async findByUserId(userId: string) {
    return prisma.notifications.findMany({
      where: { userid: userId },
      orderBy: { notificationAt: Prisma.SortOrder.desc },
    });
  },

  /**
   * 查询指定用户的未读通知数量
   */
  async countUnread(userId: string) {
    return prisma.notifications.count({
      where: { userid: userId, isRead: false },
    });
  },

  /**
   * 标记单条通知为已读
   */
  async markAsRead(notificationId: number) {
    return prisma.notifications.update({
      where: { notificationid: notificationId },
      data: { isRead: true },
    });
  },

  /**
   * 批量标记指定用户所有通知为已读
   */
  async markAllAsRead(userId: string) {
    return prisma.notifications.updateMany({
      where: { userid: userId, isRead: false },
      data: { isRead: true },
    });
  },

  /**
   * 创建一条新通知
   */
  async create(data: {
    userid: string;
    notificationText: string;
    type?: string;
    targetUrl?: string;
    referenceId?: string;
    referenceType?: string;
  }) {
    return prisma.notifications.create({ data });
  },

  /**
   * 批量创建多条通知（例如系统公告或剧集更新）
   */
  async createMany(
    data: {
      userid: string;
      notificationText: string;
      type?: string;
      targetUrl?: string;
      referenceId?: string;
      referenceType?: string;
    }[],
  ) {
    return prisma.notifications.createMany({ data });
  },

  /**
   * 查询单条通知（用于权限校验）
   */
  async findById(notificationId: number) {
    return prisma.notifications.findUnique({
      where: { notificationid: notificationId },
    });
  },

  /**
   * 删除单条通知
   */
  async delete(notificationId: number) {
    return prisma.notifications.delete({
      where: { notificationid: notificationId },
    });
  },

  /**
   * 批量删除指定用户的通知（提供 ids 删指定，不提供删所有）
   */
  async deleteMany(userId: string, notificationIds?: number[]) {
    const whereClause: Prisma.notificationsWhereInput = { userid: userId };
    if (notificationIds && notificationIds.length > 0) {
      whereClause.notificationid = { in: notificationIds };
    }
    return prisma.notifications.deleteMany({
      where: whereClause,
    });
  },
};
