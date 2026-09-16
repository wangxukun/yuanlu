import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isPremiumUser } from "@/core/auth/guard";
import { FREE_SENTENCE_LIMIT } from "@/lib/quota";
import type {
  SavedSentenceItem,
  SavedSentenceQuery,
  ToggleSentenceSaveInput,
  UpdateSentenceMetaInput,
} from "./dto";

/** toggleSave 结果：quotaExceeded 表示免费容量已满、新增方向被拦截 */
export interface ToggleSaveResult {
  saved: boolean;
  sentence: SavedSentenceItem | null;
  /** [P3-a] 免费配额触墙（仅"从无到有"的新增方向；取消收藏永不拦截） */
  quotaExceeded?: boolean;
  /** 操作后的收藏总数（触墙时 = 上限；成功时供前端 80% 预告判断） */
  totalCount?: number;
  /** 生效的容量上限 */
  limit?: number;
}

/**
 * 句子本（SavedSentence）服务层
 *
 * 数据口径与生词本（vocabulary）保持一致：
 * - 归属校验统一 userid 比对，删除/更新仅允许操作本人数据
 * - 返回给前端把 Date 序列化为 ISO 字符串，避免 Client Component 序列化警告
 * - 同一用户对同一字幕句只存一条（userid+episodeid+subtitleId 唯一索引）
 *
 * [P3-a] 免费容量配额（FREE_SENTENCE_LIMIT=30）在本层统一执行（M5：
 * REST 与 Server Action 双口径天然同源）；配额检查 + create 在同一事务内，
 * 并以用户级 pg_advisory_xact_lock 串行化同一用户的并发 toggle（M1，
 * 防多端快速双击绕过 count 检查）。超额数据永不回收：删除/查看/播放不受限，
 * 仅冻结新增（降级口径与生词本对齐）。
 */
export const sentencesService = {
  /**
   * 切换收藏状态：已收藏则删除（返回 saved:false），未收藏则创建（返回 saved:true）。
   * subtitleId 缺失时按 startTime 落点定位已有记录，避免重复收藏同一句。
   * 免费用户新增方向超容量时返回 quotaExceeded（不抛错，事务无写操作自然提交）。
   */
  async toggleSave(
    userId: string,
    input: ToggleSentenceSaveInput,
  ): Promise<ToggleSaveResult> {
    const where: Prisma.SavedSentenceWhereInput = {
      userid: userId,
      episodeid: input.episodeid,
    };
    if (input.subtitleId != null) {
      where.subtitleId = input.subtitleId;
    } else {
      where.startTime = input.startTime;
    }

    // 会员判定在 service 内自查（ADMIN 通道 + 有效订阅），调用方无需传参
    const user = await prisma.user.findUnique({
      where: { userid: userId },
      select: { role: true },
    });
    const premium = await isPremiumUser({
      role: user?.role,
      userid: userId,
    });

    return prisma.$transaction(async (tx) => {
      // [M1] 用户级事务咨询锁：同一用户并发 toggle 串行执行，
      // 事务内 count 对并发新增可靠（锁随事务结束释放）
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

      const existing = await tx.savedSentence.findFirst({ where });

      // 取消收藏：永不拦截（存量复习权公理 1——删除是腾出容量的正道）
      if (existing) {
        await tx.savedSentence.delete({ where: { id: existing.id } });
        return { saved: false, sentence: null };
      }

      // 新增方向：免费用户做容量检查
      let totalCount: number | undefined;
      if (!premium) {
        totalCount = await tx.savedSentence.count({
          where: { userid: userId },
        });
        if (totalCount >= FREE_SENTENCE_LIMIT) {
          return {
            saved: false,
            sentence: null,
            quotaExceeded: true,
            totalCount,
            limit: FREE_SENTENCE_LIMIT,
          };
        }
      }

      const created = await tx.savedSentence.create({
        data: {
          userid: userId,
          episodeid: input.episodeid,
          subtitleId: input.subtitleId ?? null,
          startTime: input.startTime,
          endTime: input.endTime,
          enText: input.enText,
          zhText: input.zhText ?? null,
          // 对齐 yuanlu-podcast 语义：新收藏默认打「地道表达」标签
          tags: ["地道表达"],
        },
        include: SENTENCE_INCLUDE,
      });

      // 咨询锁下无并发新增，+1 即准确总数
      if (!premium) totalCount = (totalCount ?? 0) + 1;

      return {
        saved: true,
        sentence: toItem(created),
        totalCount,
        limit: FREE_SENTENCE_LIMIT,
      };
    });
  },

  /** 更新句子的标签与笔记 */
  async updateMeta(
    userId: string,
    input: UpdateSentenceMetaInput,
  ): Promise<SavedSentenceItem> {
    const existing = await prisma.savedSentence.findUnique({
      where: { id: input.id },
    });
    if (!existing) throw new Error("句子不存在");
    if (existing.userid !== userId) throw new Error("无权操作此句子");

    const updated = await prisma.savedSentence.update({
      where: { id: input.id },
      data: {
        note: input.note !== undefined ? input.note : undefined,
        tags: input.tags !== undefined ? input.tags : undefined,
      },
      include: SENTENCE_INCLUDE,
    });

    return toItem(updated);
  },

  /**
   * 获取用户收藏列表，支持多维度筛选：
   * - episodeid：按播客单集（来源）筛选
   * - tag：按标签筛选（数组 contains）
   * - from/to：按收藏时间范围筛选
   * - q：中英文（及笔记）不区分大小写的全文检索
   */
  async getSavedSentences(
    userId: string,
    query: SavedSentenceQuery = {},
  ): Promise<SavedSentenceItem[]> {
    const where: Prisma.SavedSentenceWhereInput = { userid: userId };

    if (query.episodeid) where.episodeid = query.episodeid;
    if (query.tag) where.tags = { has: query.tag };
    if (query.from || query.to) {
      where.createAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }

    const list = await prisma.savedSentence.findMany({
      where,
      include: SENTENCE_INCLUDE,
      orderBy: { createAt: Prisma.SortOrder.desc },
    });

    // 全文检索对齐 yuanlu-podcast 口径：enText/zhText/note/tags 均做
    // 不区分大小写的 substring 命中（Postgres 数组无 substring contains
    // 原生映射，且列表为用户级全量，取回后在应用层过滤）
    if (query.q?.trim()) {
      const needle = query.q.trim().toLowerCase();
      return list
        .filter((s) => {
          const inEn = s.enText.toLowerCase().includes(needle);
          const inZh = (s.zhText ?? "").toLowerCase().includes(needle);
          const inNote = (s.note ?? "").toLowerCase().includes(needle);
          const inTags = s.tags.some((t) => t.toLowerCase().includes(needle));
          return inEn || inZh || inNote || inTags;
        })
        .map(toItem);
    }

    return list.map(toItem);
  },

  /** 删除收藏句子 */
  async deleteSentence(userId: string, id: number): Promise<void> {
    const existing = await prisma.savedSentence.findUnique({
      where: { id },
    });
    if (!existing) throw new Error("句子不存在");
    if (existing.userid !== userId) throw new Error("无权操作此句子");

    await prisma.savedSentence.delete({ where: { id } });
  },

  /**
   * 获取用户在某剧集已收藏的字幕句 key 集合（字幕面板书签态），
   * 附带用户全部历史标签（快捷打标签候选）。
   */
  async getEpisodeSaveState(userId: string, episodeid: string) {
    const [saved, tagRows] = await Promise.all([
      prisma.savedSentence.findMany({
        where: { userid: userId, episodeid },
        select: { subtitleId: true, startTime: true },
      }),
      prisma.savedSentence.findMany({
        where: { userid: userId },
        select: { tags: true },
      }),
    ]);

    const subtitleIds = saved
      .map((s) => s.subtitleId)
      .filter((id): id is number => id != null);

    const allTags = Array.from(new Set(tagRows.flatMap((r) => r.tags)));

    return { subtitleIds, allTags };
  },
};

/** 列表查询统一带出剧集标题与所属播客标题 */
const SENTENCE_INCLUDE = {
  episode: {
    select: {
      title: true,
      podcast: { select: { title: true } },
    },
  },
} satisfies Prisma.SavedSentenceInclude;

type SentenceWithEpisode = Prisma.SavedSentenceGetPayload<{
  include: typeof SENTENCE_INCLUDE;
}>;

function toItem(row: SentenceWithEpisode): SavedSentenceItem {
  return {
    id: row.id,
    episodeid: row.episodeid,
    episodeTitle: row.episode?.title || "未知剧集",
    podcastTitle: row.episode?.podcast?.title ?? null,
    subtitleId: row.subtitleId,
    startTime: row.startTime,
    endTime: row.endTime,
    enText: row.enText,
    zhText: row.zhText,
    note: row.note,
    tags: row.tags,
    createAt: row.createAt.toISOString(),
    updateAt: row.updateAt.toISOString(),
  };
}
