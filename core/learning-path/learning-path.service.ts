// yuanlu/core/learning-path/learning-path.service.ts

import prisma from "@/lib/prisma";
import { CreateLearningPathDto, LearningPathDto } from "./dto";
import { Prisma } from "@prisma/client";
import { generateSignatureUrl } from "@/lib/oss";

export const learningPathService = {
  /**
   * 创建新的学习路径
   */
  async create(userid: string, data: CreateLearningPathDto) {
    return await prisma.learning_paths.create({
      data: {
        userid,
        pathName: data.pathName,
        description: data.description,
        isPublic: data.isPublic,
      },
    });
  },

  /**
   * 获取用户的学习路径列表 (摘要信息)
   */
  async listByUser(userid: string): Promise<LearningPathDto[]> {
    const paths = await prisma.learning_paths.findMany({
      where: { userid },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: {
        creationAt: Prisma.SortOrder.desc,
      },
    });

    return paths.map((p) => ({
      ...p,
      userid: p.userid ?? "", // [修复] 处理 Prisma 返回的 nullable 类型，确保符合 DTO 定义
      itemCount: p._count.items,
    }));
  },

  /**
   * 获取学习路径详情 (包含剧集列表)
   */
  async getById(pathid: number, currentUserId?: string) {
    const path = await prisma.learning_paths.findUnique({
      where: { pathid },
      include: {
        items: {
          orderBy: {
            order: Prisma.SortOrder.asc,
          },
          include: {
            episode: {
              select: {
                episodeid: true,
                title: true,
                audioUrl: true,
                audioFileName: true,
                coverUrl: true,
                coverFileName: true,
                duration: true,
                isExclusive: true,
                podcast: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!path) return null;

    const signedItems = await Promise.all(
      path.items.map(async (item) => ({
        ...item,
        episode: {
          ...item.episode,
          coverUrl: item.episode.coverFileName
            ? await generateSignatureUrl(
                item.episode.coverFileName,
                60 * 60 * 3,
              )
            : null,
          audioUrl: item.episode.audioFileName
            ? await generateSignatureUrl(
                item.episode.audioFileName,
                60 * 60 * 3,
              )
            : null,
        },
      })),
    );

    // 权限检查：如果是私有的且不是创建者，拒绝访问
    if (!path.isPublic && path.userid !== currentUserId) {
      throw new Error("无权访问此学习路径");
    }

    return {
      ...path,
      items: signedItems,
    };
  },

  /**
   * 移动端详情装配（GET api/learning-paths/{pathid} 的数据层）：
   * 在 getById（已含签名封面/音频）基础上合并创建者昵称与当前用户收听态，
   * 输出与 Web 详情页 [id]/page.tsx 的 transformedPath 同构，
   * 对齐 Android 端 LearningPathDetailDto 契约（episode 携带 progressSeconds/isFinished）。
   */
  async getMobileDetail(pathid: number, currentUserId?: string) {
    const rawPath = await this.getById(pathid, currentUserId);
    if (!rawPath) return null;

    const creator = rawPath.userid
      ? await prisma.user.findUnique({
          where: { userid: rawPath.userid },
          include: { user_profile: true },
        })
      : null;

    const histories = currentUserId
      ? await prisma.listening_history.findMany({
          where: {
            userid: currentUserId,
            episodeid: { in: rawPath.items.map((item) => item.episodeid) },
          },
          select: { episodeid: true, progressSeconds: true, isFinished: true },
        })
      : [];
    const historyMap = new Map(histories.map((h) => [h.episodeid, h]));

    return {
      pathid: rawPath.pathid,
      userid: rawPath.userid,
      pathName: rawPath.pathName,
      description: rawPath.description,
      isPublic: rawPath.isPublic,
      creationAt: rawPath.creationAt,
      // 路径封面 = 第一集签名封面（无剧集为 null，客户端回退标题占位）
      coverUrl: rawPath.items[0]?.episode?.coverUrl || null,
      creatorName: creator?.user_profile?.nickname || "User",
      items: rawPath.items.map((item) => ({
        id: item.id,
        episodeid: item.episodeid,
        order: item.order,
        addedAt: item.addedAt,
        episode: {
          episodeid: item.episodeid,
          title: item.episode.title,
          coverUrl: item.episode.coverUrl,
          audioUrl: item.episode.audioUrl ?? "",
          duration: item.episode.duration,
          isExclusive: item.episode.isExclusive ?? false,
          podcast: { title: item.episode.podcast?.title ?? "" },
          progressSeconds: historyMap.get(item.episodeid)?.progressSeconds ?? 0,
          isFinished: historyMap.get(item.episodeid)?.isFinished ?? false,
        },
      })),
    };
  },

  /**
   * 更新学习路径元数据
   */
  async update(
    pathid: number,
    userid: string,
    data: Partial<CreateLearningPathDto>,
  ) {
    // 确保只有拥有者可以更新
    const existing = await prisma.learning_paths.findUnique({
      where: { pathid },
    });
    if (!existing || existing.userid !== userid) throw new Error("无权操作");

    return await prisma.learning_paths.update({
      where: { pathid },
      data,
    });
  },

  /**
   * 删除学习路径
   */
  async delete(pathid: number, userid: string) {
    const existing = await prisma.learning_paths.findUnique({
      where: { pathid },
    });
    if (!existing || existing.userid !== userid) throw new Error("无权操作");

    return await prisma.learning_paths.delete({ where: { pathid } });
  },

  /**
   * 添加剧集到路径 (自动追加到末尾)
   */
  async addEpisode(pathid: number, userid: string, episodeid: string) {
    const path = await prisma.learning_paths.findUnique({ where: { pathid } });
    if (!path || path.userid !== userid) throw new Error("无权操作");

    // 检查是否已存在
    const exists = await prisma.learning_path_items.findFirst({
      where: { pathid, episodeid },
    });
    if (exists) throw new Error("该剧集已在列表中");

    // 获取当前最大 order
    const lastItem = await prisma.learning_path_items.findFirst({
      where: { pathid },
      orderBy: {
        order: Prisma.SortOrder.desc,
      },
    });
    const newOrder = lastItem ? lastItem.order + 1 : 0;

    return await prisma.learning_path_items.create({
      data: {
        pathid,
        episodeid,
        order: newOrder,
      },
    });
  },

  /**
   * 从路径中移除剧集
   */
  async removeEpisode(itemId: number, userid: string) {
    // 需要连表查询验证权限
    const item = await prisma.learning_path_items.findUnique({
      where: { id: itemId },
      include: { path: true },
    });

    // 区分“条目不存在”与“非拥有者”：REST 层据此映射 404 / 403
    // （Web action 侧统一 catch 显示“移除失败”，不受区分影响）
    if (!item) throw new Error("条目不存在");
    if (item.path.userid !== userid) throw new Error("无权操作");

    return await prisma.learning_path_items.delete({
      where: { id: itemId },
    });
  },

  /**
   * 重新排序 (拖拽排序)
   * 接收一个 { itemId, newOrder } 的数组
   */
  async reorderItems(
    pathid: number,
    userid: string,
    items: { id: number; order: number }[],
  ) {
    const path = await prisma.learning_paths.findUnique({ where: { pathid } });
    if (!path || path.userid !== userid) throw new Error("无权操作");

    // 使用事务批量更新
    return await prisma.$transaction(
      items.map((item) =>
        prisma.learning_path_items.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
  },

  /**
   *  获取用于卡片展示的详细列表（包含封面、创建者信息）
   */
  async listWithDetails(userid: string) {
    const paths = await prisma.learning_paths.findMany({
      where: { userid },
      include: {
        _count: {
          select: { items: true },
        },
        // 获取第一集作为路径封面
        items: {
          take: 1,
          orderBy: {
            order: Prisma.SortOrder.asc,
          },
          include: {
            episode: {
              select: {
                coverFileName: true,
                coverUrl: true,
              },
            },
          },
        },
        // 获取创建者昵称
        User: {
          select: {
            user_profile: {
              select: { nickname: true },
            },
          },
        },
      },
      orderBy: {
        creationAt: Prisma.SortOrder.desc,
      },
    });

    const pathIds = paths.map((p) => p.pathid);
    const allItems = await prisma.learning_path_items.findMany({
      where: { pathid: { in: pathIds } },
      select: { pathid: true, episodeid: true },
    });

    const episodeIds = allItems.map((item) => item.episodeid);
    const finishedHistories = await prisma.listening_history.findMany({
      where: {
        userid: userid,
        episodeid: { in: episodeIds },
        isFinished: true,
      },
      select: { episodeid: true },
    });
    const finishedEpisodeIds = new Set(
      finishedHistories.map((h) => h.episodeid),
    );

    const progressMap = new Map<number, number>();
    for (const pathId of pathIds) {
      const itemsForPath = allItems.filter((item) => item.pathid === pathId);
      if (itemsForPath.length === 0) {
        progressMap.set(pathId, 0);
      } else {
        const finishedCount = itemsForPath.filter((item) =>
          finishedEpisodeIds.has(item.episodeid),
        ).length;
        progressMap.set(
          pathId,
          Math.round((finishedCount / itemsForPath.length) * 100),
        );
      }
    }

    // TODO coverUrl签名处理
    // 遍历 paths 数组并异步处理每个 episode 的 coverUrl
    const pathsWithSignedUrls = await Promise.all(
      paths.map(async (p) => {
        const signedCoverUrl =
          p.items.length > 0 && p.items[0]?.episode?.coverFileName
            ? await generateSignatureUrl(
                p.items[0]?.episode.coverFileName,
                60 * 60 * 3,
              )
            : null;

        return {
          pathid: p.pathid,
          pathName: p.pathName,
          description: p.description,
          isPublic: p.isPublic,
          itemCount: p._count.items,
          // 使用签名后的 coverUrl 或默认值
          coverUrl: signedCoverUrl || null,
          creatorName: p.User?.user_profile?.nickname || "我",
          creationAt: p.creationAt,
          progress: progressMap.get(p.pathid) || 0,
          isOfficial: false,
        };
      }),
    );

    return pathsWithSignedUrls;

    // return paths.map(p => ({
    //     pathid: p.pathid,
    //     pathName: p.pathName,
    //     description: p.description,
    //     isPublic: p.isPublic,
    //     itemCount: p._count.items,
    //     // 如果路径为空，使用默认封面或 null
    //     coverUrl: p.items[0]?.episode?.coverUrl || null,
    //     creatorName: p.User?.user_profile?.nickname || "我",
    //     creationAt: p.creationAt,
    //     // 暂时模拟进度，后续可关联 user_daily_activity 计算
    //     progress: 0,
    //     isOfficial: false
    // }));
  },

  /**
   * 获取公开的学习路径（模拟“官方推荐”）
   * 可以根据 userid 过滤，或者获取所有 isPublic=true 的路径
   */
  async listPublic(excludeUserId?: string) {
    const paths = await prisma.learning_paths.findMany({
      where: {
        isPublic: true,
        userid: excludeUserId ? { not: excludeUserId } : undefined,
      },
      include: {
        _count: { select: { items: true } },
        items: {
          take: 1,
          orderBy: {
            order: Prisma.SortOrder.asc,
          },
          include: {
            episode: {
              select: {
                coverUrl: true,
                coverFileName: true,
              },
            },
          },
        },
        User: {
          select: {
            user_profile: { select: { nickname: true } },
          },
        },
      },
      orderBy: {
        creationAt: Prisma.SortOrder.desc,
      },
      take: 20, // 限制数量
    });

    const pathIds = paths.map((p) => p.pathid);
    const allItems = await prisma.learning_path_items.findMany({
      where: { pathid: { in: pathIds } },
      select: { pathid: true, episodeid: true },
    });

    let finishedEpisodeIds = new Set<string>();
    if (excludeUserId) {
      const episodeIds = allItems.map((item) => item.episodeid);
      const finishedHistories = await prisma.listening_history.findMany({
        where: {
          userid: excludeUserId,
          episodeid: { in: episodeIds },
          isFinished: true,
        },
        select: { episodeid: true },
      });
      finishedEpisodeIds = new Set(
        finishedHistories
          .map((h) => h.episodeid)
          .filter((id): id is string => id !== null),
      );
    }

    const progressMap = new Map<number, number>();
    for (const pathId of pathIds) {
      const itemsForPath = allItems.filter((item) => item.pathid === pathId);
      if (itemsForPath.length === 0) {
        progressMap.set(pathId, 0);
      } else {
        const finishedCount = itemsForPath.filter((item) =>
          finishedEpisodeIds.has(item.episodeid),
        ).length;
        progressMap.set(
          pathId,
          Math.round((finishedCount / itemsForPath.length) * 100),
        );
      }
    }

    const result = await Promise.all(
      paths.map(async (p) => {
        const episode = p.items[0]?.episode;

        const signedCoverUrl = episode?.coverFileName
          ? await generateSignatureUrl(episode.coverFileName, 60 * 60 * 3)
          : null;

        return {
          pathid: p.pathid,
          pathName: p.pathName,
          description: p.description,
          isPublic: p.isPublic,
          itemCount: p._count.items,
          coverUrl: signedCoverUrl,
          creatorName: p.User?.user_profile?.nickname || "Unknown",
          creationAt: p.creationAt,
          progress: progressMap.get(p.pathid) || 0,
          isOfficial: false,
        };
      }),
    );

    return result;

    // return paths.map(p => ({
    //     pathid: p.pathid,
    //     pathName: p.pathName,
    //     description: p.description,
    //     isPublic: p.isPublic,
    //     itemCount: p._count.items,
    //     coverUrl: p.items[0]?.episode?.coverUrl || null,
    //     creatorName: p.User?.user_profile?.nickname || "Unknown",
    //     creationAt: p.creationAt,
    //     // 暂时模拟进度，后续可关联 user_daily_activity 计算
    //     progress: 0,
    //     // 简单逻辑：如果是管理员ID创建的，视为 Official (这里仅作示例)
    //     isOfficial: false
    // }));
  },
};
