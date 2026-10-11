import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  speechProfileService,
  CEFR_EPISODE_MAPPING,
  LEVEL_MAPPING,
} from "@/core/speech-profile/speech-profile.service";

/**
 * 发现页「为您推荐」统一推荐服务（三端共用）
 *
 * Web 发现页（getEditorPicks）与 /api/podcast/list（Android/小程序客户端
 * filter(isEditorPick) 派生「为您推荐」区块）都经由本模块产出同一份排序，
 * 保证三端看到的推荐集合与顺序一致。
 *
 * 打分项（权重集中在此便于调参）：
 * - 运营加权：isEditorPick +40
 * - 热度：log10(1+totalPlays)×8 + log10(1+followerCount)×6（对数压缩防头部垄断）
 * - 更新新鲜度：最新一集发布距今天数 d，20×(90-d)/90（90 天外归零），超 180 天 -10 弃更降权
 * - 内容完备度：min(episodeCount,30)/30 × 10
 * - 新节目冷启动：createAt ≤30 天 +8
 *
 * 个性化（有 userId 时，三端请求均带登录态）：
 * - 排除已收藏（podcast_favorites）
 * - 近 30 天听过降权 -15
 * - 难度匹配：语音评测推导等级优先、回退 learnLevel，映射目标难度集后
 *   按该播客已发布剧集命中占比 ×25 加权；General 不参与（对齐 getRecommendedEpisodes 口径）
 *
 * 排序确定性：分数并列按 totalPlays desc → podcastid asc；无随机、无时间抖动
 * （新鲜度按整天计算，同一天内刷新结果稳定）。
 */

/** 推荐坑位数：web 发现页横滑取 8，移动端客户端 filter(isEditorPick) 取前 6 */
export const DISCOVER_RECOMMEND_LIMIT = 8;

// ── 全局分权重 ──
const W_EDITOR_PICK = 40;
const W_PLAYS = 8;
const W_FOLLOWERS = 6;
const W_FRESHNESS = 20;
const FRESH_ZERO_DAYS = 90; // 最新一集距今天数超过该值，新鲜度为 0
const STALE_PENALTY_DAYS = 180; // 超过该值视为弃更，降权
const STALE_PENALTY = -10;
const W_COMPLETENESS = 10;
const COMPLETENESS_MAX_EPS = 30;
const W_COLD_START = 8;
const COLD_START_DAYS = 30;

// ── 个性化权重 ──
const W_LEVEL_MATCH = 25;
const RECENT_LISTEN_PENALTY = -15;
const RECENT_LISTEN_DAYS = 30;

// ── 多样性：推荐坑位内同一平台（频道）最多占位数 ──
const MAX_PER_PLATFORM = 2;

const recommendPoolQuery = {
  where: {
    coverFileName: { not: null },
  },
  select: {
    podcastid: true,
    title: true,
    coverUrl: true,
    coverFileName: true,
    description: true,
    platform: true,
    isEditorPick: true,
    totalPlays: true,
    followerCount: true,
    createAt: true,
    tags: {
      select: { id: true, name: true },
    },
    _count: {
      select: { episode: true },
    },
    episode: {
      take: 1,
      orderBy: { publishAt: Prisma.SortOrder.desc },
      select: { publishAt: true },
    },
  },
} satisfies Prisma.podcastFindManyArgs;

type RecommendPoolRow = Prisma.podcastGetPayload<typeof recommendPoolQuery>;

/** 排序后的候选行（score 为内部调试字段，API 响应中会被剥离） */
export interface RankedPodcast
  extends Omit<RecommendPoolRow, "_count" | "episode"> {
  episodeCount: number;
  lastPublishAt: Date | null;
  score: number;
}

export interface DiscoverRanking {
  /** 全候选池排序：推荐坑位在前（推荐序），其余按分数降序 */
  ranked: RankedPodcast[];
  /** 推荐集合（即 ranked 前 limit 个的 id），/api/podcast/list 据此重算 isEditorPick 标记 */
  recommendedIds: Set<string>;
}

/** 相差的整天数（按天取整保证同日内排序稳定） */
function daysBetween(from: Date, now: Date): number {
  return Math.floor((now.getTime() - from.getTime()) / 86_400_000);
}

export interface PodcastScoreInput {
  isEditorPick: boolean | null;
  totalPlays: number;
  followerCount: number;
  createAt: Date;
  episodeCount: number;
  lastPublishAt: Date | null;
  /** 个性化：近 30 天听过 */
  recentlyListened?: boolean;
  /** 个性化：难度命中占比 0~1；null 表示无个性化画像 */
  levelMatchRatio?: number | null;
  now: Date;
}

/** 单播客打分（纯函数，便于脚本/测试单独校验） */
export function scorePodcast(input: PodcastScoreInput): number {
  let score = 0;

  if (input.isEditorPick) score += W_EDITOR_PICK;

  score += Math.log10(1 + input.totalPlays) * W_PLAYS;
  score += Math.log10(1 + input.followerCount) * W_FOLLOWERS;

  if (input.lastPublishAt) {
    const days = daysBetween(input.lastPublishAt, input.now);
    if (days > STALE_PENALTY_DAYS) {
      score += STALE_PENALTY;
    } else {
      score +=
        (W_FRESHNESS * Math.max(0, FRESH_ZERO_DAYS - days)) / FRESH_ZERO_DAYS;
    }
  }

  score +=
    (Math.min(input.episodeCount, COMPLETENESS_MAX_EPS) /
      COMPLETENESS_MAX_EPS) *
    W_COMPLETENESS;

  if (daysBetween(input.createAt, input.now) <= COLD_START_DAYS)
    score += W_COLD_START;

  if (input.recentlyListened) score += RECENT_LISTEN_PENALTY;
  if (input.levelMatchRatio != null)
    score += input.levelMatchRatio * W_LEVEL_MATCH;

  return score;
}

/**
 * 解析用户等级标签与目标难度集（播客级/剧集级推荐共用）：
 * 语音评测推导等级优先（标签为 CEFR 档如 B2），回退 learnLevel（标签为
 * Beginner/Intermediate 等）；无 userId 或解析失败回退 General。
 */
export async function resolveUserLevel(
  userId?: string,
): Promise<{ label: string; targetDifficulties: string[] }> {
  if (!userId) return { label: "General", targetDifficulties: [] };
  try {
    const derived = await speechProfileService.getDerivedLevel(userId);
    if (derived) {
      return {
        label: derived,
        targetDifficulties: CEFR_EPISODE_MAPPING[derived] ?? [],
      };
    }

    const profile = await prisma.user_profile.findUnique({
      where: { userid: userId },
      select: { learnLevel: true },
    });
    if (profile?.learnLevel) {
      return {
        label: profile.learnLevel,
        targetDifficulties: LEVEL_MAPPING[profile.learnLevel] ?? [],
      };
    }
  } catch (e) {
    console.error("[discover-recommend] resolve user level failed:", e);
  }
  return { label: "General", targetDifficulties: [] };
}

interface PersonalizationContext {
  favoritedIds: Set<string>;
  recentlyListenedIds: Set<string>;
  /** podcastid → 已发布剧集难度命中占比 */
  levelMatchRatio: Map<string, number>;
}

/** 个性化子查询失败时降级为空上下文（回退全局打分），不影响主列表返回 */
async function loadPersonalization(
  userId: string,
  pool: RecommendPoolRow[],
): Promise<PersonalizationContext> {
  const ctx: PersonalizationContext = {
    favoritedIds: new Set(),
    recentlyListenedIds: new Set(),
    levelMatchRatio: new Map(),
  };

  try {
    const [favorites, recentHistory, targetDifficulties] = await Promise.all([
      prisma.podcast_favorites.findMany({
        where: { userid: userId },
        select: { podcastid: true },
      }),
      prisma.listening_history.findMany({
        where: {
          userid: userId,
          listenAt: {
            gte: new Date(Date.now() - RECENT_LISTEN_DAYS * 86_400_000),
          },
          episode: { podcastid: { not: null } },
        },
        select: { episode: { select: { podcastid: true } } },
      }),
      resolveUserLevel(userId).then((r) => r.targetDifficulties),
    ]);

    for (const f of favorites) {
      if (f.podcastid) ctx.favoritedIds.add(f.podcastid);
    }
    for (const h of recentHistory) {
      if (h.episode?.podcastid)
        ctx.recentlyListenedIds.add(h.episode.podcastid);
    }

    // General 只匹配 General 内容，对播客级推荐无区分度，跳过（对齐 getRecommendedEpisodes 口径）
    const useLevelMatch =
      targetDifficulties.length > 0 &&
      !(targetDifficulties.length === 1 && targetDifficulties[0] === "General");

    if (useLevelMatch && pool.length > 0) {
      const groups = await prisma.episode.groupBy({
        by: ["podcastid", "difficulty"],
        where: {
          status: "published",
          podcastid: { in: pool.map((p) => p.podcastid) },
        },
        _count: { _all: true },
      });

      const agg = new Map<string, { total: number; matched: number }>();
      for (const g of groups) {
        if (!g.podcastid) continue;
        const cur = agg.get(g.podcastid) ?? { total: 0, matched: 0 };
        cur.total += g._count._all;
        if (g.difficulty && targetDifficulties.includes(g.difficulty)) {
          cur.matched += g._count._all;
        }
        agg.set(g.podcastid, cur);
      }
      for (const [podcastid, { total, matched }] of agg) {
        if (total > 0) ctx.levelMatchRatio.set(podcastid, matched / total);
      }
    }
  } catch (e) {
    console.error(
      "[discover-recommend] load personalization failed, fallback to global:",
      e,
    );
  }

  return ctx;
}

/**
 * 产出发现页「为您推荐」统一排序。
 * @param userId 可选登录用户（web session / 移动端 Bearer 均可），未登录为全局打分
 * @param limit 推荐坑位数，默认 8
 */
export async function getDiscoverRanking(
  userId?: string,
  limit: number = DISCOVER_RECOMMEND_LIMIT,
): Promise<DiscoverRanking> {
  const pool = await prisma.podcast.findMany(recommendPoolQuery);
  const now = new Date();

  const ctx = userId ? await loadPersonalization(userId, pool) : null;

  const scored: RankedPodcast[] = pool
    .filter((p) => !ctx?.favoritedIds.has(p.podcastid))
    .map(({ _count, episode, ...p }) => ({
      ...p,
      episodeCount: _count.episode,
      lastPublishAt: episode[0]?.publishAt ?? null,
      score: scorePodcast({
        isEditorPick: p.isEditorPick,
        totalPlays: p.totalPlays,
        followerCount: p.followerCount,
        createAt: p.createAt,
        episodeCount: _count.episode,
        lastPublishAt: episode[0]?.publishAt ?? null,
        recentlyListened: ctx
          ? ctx.recentlyListenedIds.has(p.podcastid)
          : false,
        levelMatchRatio: ctx
          ? (ctx.levelMatchRatio.get(p.podcastid) ?? null)
          : null,
        now,
      }),
    }));

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.totalPlays - a.totalPlays ||
      a.podcastid.localeCompare(b.podcastid),
  );

  // 推荐坑位内做平台多样性装填：同一平台超过 MAX_PER_PLATFORM 个则延后，
  // 延后与未入选的仍按分数降序排在坑位之后（供"全部播客"等区块使用）
  const window: RankedPodcast[] = [];
  const deferred: RankedPodcast[] = [];
  const platformCount = new Map<string, number>();
  for (const p of scored) {
    if (window.length >= limit) {
      deferred.push(p);
      continue;
    }
    const key = p.platform || "";
    if ((platformCount.get(key) ?? 0) >= MAX_PER_PLATFORM) {
      deferred.push(p);
      continue;
    }
    window.push(p);
    platformCount.set(key, (platformCount.get(key) ?? 0) + 1);
  }

  return {
    ranked: [...window, ...deferred],
    recommendedIds: new Set(window.map((p) => p.podcastid)),
  };
}
