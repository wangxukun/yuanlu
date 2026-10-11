import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { resolveUserLevel } from "@/lib/discover-recommend";

/**
 * 主页「为你推荐」统一剧集推荐服务（三端共用）
 *
 * Web 主页/更多推荐页（episodeService.getRecommendedEpisodes）与
 * /api/episode/list 分页模式（Android/小程序主页候选池，客户端按
 * learnLevel→CEFR 映射 filter 后取前 4）都经由本模块产出同一份排序，
 * 保证三端口径一致。
 *
 * 打分项（权重集中在此便于调参）：
 * - 热度：log10(1+playCount)×6（对数压缩防头部垄断）
 * - 新鲜度：publishAt 距今天数 d，20×(90-d)/90（90 天外归零），超 180 天 -8 老剧降权
 * - 等级命中（登录）：目标档 +10 —— 温和加权而非排序首键，既让目标难度剧集
 *   在客户端 filter 后自然靠前，又不垄断头部（避免与"最新发布"模块完全同批）
 *
 * 个性化（有 userId 时，三端请求均带登录态）：
 * - 排除已看完（listening_history.isFinished=true）与已收藏（episode_favorites）
 * - 听过未看完降权 -20（"继续收听"模块负责承接）
 *
 * 候选窗口：最近 CANDIDATE_WINDOW=300 条已发布剧集（新鲜度衰减下窗口外
 * 老剧本也难进头部；全库不足 300 即全量）。
 *
 * 排序确定性：分数并列按 playCount desc → episodeid asc；无随机、无时间抖动
 * （新鲜度按整天计算，同一天内刷新结果稳定）。
 */

// ── 全局分权重 ──
const W_PLAYS = 6;
const W_FRESHNESS = 20;
const FRESH_ZERO_DAYS = 90;
const STALE_PENALTY_DAYS = 180;
const STALE_PENALTY = -8;

// ── 个性化权重 ──
const W_LEVEL_MATCH = 10;
const LISTENED_INCOMPLETE_PENALTY = -20;

// ── 多样性：头部窗口内同一播客最多占位数 ──
const MAX_PER_PODCAST = 2;
const DIVERSITY_WINDOW = 12;

/** 候选窗口大小：仅取最近 N 条已发布剧集参与打分 */
const CANDIDATE_WINDOW = 300;

// 字段为 /api/episode/list 分页模式所需字段的超集（另加打分用的
// duration/playCount/difficulty），web 推荐 DTO 映射也复用同一行
const candidateQuery = {
  where: { status: "published" },
  orderBy: { publishAt: Prisma.SortOrder.desc },
  take: CANDIDATE_WINDOW,
  select: {
    episodeid: true,
    title: true,
    coverUrl: true,
    coverFileName: true,
    audioUrl: true,
    audioFileName: true,
    subtitleEnUrl: true,
    subtitleEnFileName: true,
    subtitleZhUrl: true,
    subtitleZhFileName: true,
    subtitleBilingualUrl: true,
    subtitleBilingualFileName: true,
    publishAt: true,
    createAt: true,
    status: true,
    isExclusive: true,
    isCommentEnabled: true,
    duration: true,
    playCount: true,
    difficulty: true,
    podcast: {
      select: {
        podcastid: true,
        title: true,
      },
    },
    tags: {
      select: {
        id: true,
        name: true,
      },
    },
  },
} satisfies Prisma.episodeFindManyArgs;

type CandidateRow = Prisma.episodeGetPayload<typeof candidateQuery>;

/** 排序后的候选行（score 为内部调试字段，API 响应中会被剥离） */
export interface RankedEpisode extends CandidateRow {
  score: number;
}

export interface EpisodeRanking {
  /** 候选窗口打分排序：头部多样性装填后的推荐序 */
  ranked: RankedEpisode[];
  /** 用户等级解析结果（label 供 web 展示"为你推荐 - 等级"胶囊） */
  level: { label: string; targetDifficulties: string[] };
}

/** 相差的整天数（按天取整保证同日内排序稳定） */
function daysBetween(from: Date, now: Date): number {
  return Math.floor((now.getTime() - from.getTime()) / 86_400_000);
}

export interface EpisodeScoreInput {
  playCount: number;
  publishAt: Date;
  /** 个性化：难度命中用户目标档 */
  levelMatched?: boolean;
  /** 个性化：听过但未看完 */
  listenedIncomplete?: boolean;
  now: Date;
}

/** 单剧集打分（纯函数，便于脚本/测试单独校验） */
export function scoreEpisode(input: EpisodeScoreInput): number {
  let score = 0;

  score += Math.log10(1 + input.playCount) * W_PLAYS;

  const days = daysBetween(input.publishAt, input.now);
  if (days > STALE_PENALTY_DAYS) {
    score += STALE_PENALTY;
  } else {
    score +=
      (W_FRESHNESS * Math.max(0, FRESH_ZERO_DAYS - days)) / FRESH_ZERO_DAYS;
  }

  if (input.levelMatched) score += W_LEVEL_MATCH;
  if (input.listenedIncomplete) score += LISTENED_INCOMPLETE_PENALTY;

  return score;
}

interface EpisodePersonalization {
  /** 已看完 ∪ 已收藏，直接排除 */
  excludedIds: Set<string>;
  /** 听过未看完，降权 */
  incompleteIds: Set<string>;
}

/** 个性化子查询失败时降级为空上下文（回退全局打分），不影响主列表返回 */
async function loadEpisodePersonalization(
  userId: string,
): Promise<EpisodePersonalization> {
  const ctx: EpisodePersonalization = {
    excludedIds: new Set(),
    incompleteIds: new Set(),
  };

  try {
    const [history, favorites] = await Promise.all([
      prisma.listening_history.findMany({
        where: { userid: userId },
        select: { episodeid: true, isFinished: true },
      }),
      prisma.episode_favorites.findMany({
        where: { userid: userId },
        select: { episodeid: true },
      }),
    ]);

    for (const h of history) {
      if (!h.episodeid) continue;
      if (h.isFinished) ctx.excludedIds.add(h.episodeid);
      else ctx.incompleteIds.add(h.episodeid);
    }
    for (const f of favorites) {
      if (f.episodeid) ctx.excludedIds.add(f.episodeid);
    }
  } catch (e) {
    console.error(
      "[episode-recommend] load personalization failed, fallback to global:",
      e,
    );
  }

  return ctx;
}

/**
 * 产出主页「为你推荐」统一剧集排序。
 * @param userId 可选登录用户（web session / 移动端 Bearer 均可），未登录为全局打分
 */
export async function getRecommendedEpisodeRanking(
  userId?: string,
): Promise<EpisodeRanking> {
  const level = await resolveUserLevel(userId);
  const ctx = userId ? await loadEpisodePersonalization(userId) : null;

  // General 只匹配 General 内容，对推荐无区分度，跳过等级加权
  const useLevelMatch =
    level.targetDifficulties.length > 0 &&
    !(
      level.targetDifficulties.length === 1 &&
      level.targetDifficulties[0] === "General"
    );

  const episodes = await prisma.episode.findMany({
    ...candidateQuery,
    where: {
      status: "published",
      ...(ctx && ctx.excludedIds.size > 0
        ? { episodeid: { notIn: [...ctx.excludedIds] } }
        : {}),
    },
  });

  const now = new Date();
  const scored: RankedEpisode[] = episodes.map((ep) => ({
    ...ep,
    score: scoreEpisode({
      playCount: ep.playCount,
      publishAt: ep.publishAt,
      levelMatched:
        useLevelMatch &&
        !!ep.difficulty &&
        level.targetDifficulties.includes(ep.difficulty),
      listenedIncomplete: ctx ? ctx.incompleteIds.has(ep.episodeid) : false,
      now,
    }),
  }));

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.playCount - a.playCount ||
      a.episodeid.localeCompare(b.episodeid),
  );

  // 头部多样性装填：前 DIVERSITY_WINDOW 名内同一播客超过 MAX_PER_PODCAST
  // 个则延后，延后与未入选的仍按分数降序排在头部之后（供"最新发布"等
  // 直接消费接口顺序的区块使用）
  const window: RankedEpisode[] = [];
  const deferred: RankedEpisode[] = [];
  const perPodcast = new Map<string, number>();
  for (const ep of scored) {
    if (window.length >= DIVERSITY_WINDOW) {
      deferred.push(ep);
      continue;
    }
    const key = ep.podcast?.podcastid ?? "";
    if ((perPodcast.get(key) ?? 0) >= MAX_PER_PODCAST) {
      deferred.push(ep);
      continue;
    }
    window.push(ep);
    perPodcast.set(key, (perPodcast.get(key) ?? 0) + 1);
  }

  return { ranked: [...window, ...deferred], level };
}
