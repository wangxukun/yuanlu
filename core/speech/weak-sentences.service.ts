/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "@/lib/prisma";

/**
 * 发音弱项句子查询单一数据源（P2-4 / 报告 4.2-C 架构项）。
 *
 * 此前 Step A/B/C 三步查询在 errors/route、pronunciation/page、notebook/route
 * 三处逐字重复，任何口径调整都要改三处（N1/N2 口径分叉的温床）。
 * 现统一收敛到本 service：
 *   Step A  取曾低于分数线的句子（按 targetText 去重，最新在前，take 上限）
 *   Step B  取这些句子的最新一次评测
 *   Step C  仅保留最新一次仍低于分数线的句子
 *   Step D  [P2-4] 过滤"已攻克"标记：标记时间晚于最新一次评测则隐藏；
 *           标记之后又出现新的低分评测则自动重回弱项本
 *
 * 分数线默认读 user_profile.weakScoreThreshold（默认 80），与弱项列表生成、
 * 闯关页"已达标"判定共用同一口径。
 */

export const DEFAULT_WEAK_SCORE_THRESHOLD = 80;

export interface WeakSentenceQueryOptions {
  /** 预取的弱句候选上限（Step A take，默认 100） */
  takePotential?: number;
  /** 调用方已查出的 user_profile.weakScoreThreshold（避免重复查库）；缺省由 service 读取 */
  threshold?: number;
  /** episode 关联字段的 select（各调用方所需不同：闯关要音频/字幕、列表只要封面） */
  episodeSelect?: any;
}

export interface WeakSentenceResult {
  records: any[];
  /** 实际生效的分数线（供响应回传，闯关页"已达标"判定与此对齐） */
  threshold: number;
}

export async function getWeakSentences(
  userid: string,
  options: WeakSentenceQueryOptions = {},
): Promise<WeakSentenceResult> {
  const threshold =
    options.threshold !== undefined
      ? options.threshold
      : ((
          await prisma.user_profile.findUnique({
            where: { userid },
            select: { weakScoreThreshold: true },
          })
        )?.weakScoreThreshold ?? DEFAULT_WEAK_SCORE_THRESHOLD);

  // Step A: Find sentences that have a weak attempt (score < threshold)
  const potentialWeakRecords = await prisma.speech_recognition.findMany({
    where: {
      userid,
      overallScore: { lt: threshold },
    },
    orderBy: { recognitionDate: "desc" },
    distinct: ["targetText"],
    take: options.takePotential ?? 100,
  });

  const potentialTexts = potentialWeakRecords
    .map((r) => r.targetText)
    .filter(Boolean) as string[];

  if (potentialTexts.length === 0) {
    return { records: [], threshold };
  }

  // Step B: Get the absolute latest attempt for these sentences
  const latestAttempts = await prisma.speech_recognition.findMany({
    where: {
      userid,
      targetText: { in: potentialTexts },
    },
    orderBy: { recognitionDate: "desc" },
    distinct: ["targetText"],
    include: {
      episode: options.episodeSelect
        ? { select: options.episodeSelect }
        : undefined,
    },
  });

  // Step C: Only keep them if the latest attempt is STILL below threshold
  const stillWeak = latestAttempts.filter(
    (r) => r.overallScore !== null && r.overallScore < threshold,
  );

  // Step D: [P2-4] 过滤已攻克标记——仅当标记晚于该句最新一次评测时隐藏
  const dismissals = await prisma.dismissed_pronunciation.findMany({
    where: { userid },
    select: { targetText: true, dismissedAt: true },
  });
  if (dismissals.length > 0) {
    const dismissedAtMap = new Map<string, number>(
      dismissals.map(
        (d) => [d.targetText, d.dismissedAt.getTime()] as [string, number],
      ),
    );
    return {
      records: stillWeak.filter((r) => {
        // Step B 以非空 targetText 集合查询，此处仅做类型收窄兜底
        if (!r.targetText) return true;
        const dismissedAt = dismissedAtMap.get(r.targetText);
        if (dismissedAt === undefined) return true;
        // 最新评测晚于标记时间 → 标记后又有新低分，重新回到弱项本
        return r.recognitionDate
          ? r.recognitionDate.getTime() >= dismissedAt
          : true;
      }),
      threshold,
    };
  }

  return { records: stillWeak, threshold };
}

/**
 * [P2-4] 标记某句"已攻克"（免费、不限次数）：upsert 标记行，
 * dismissedAt 刷新为现在——重复标记幂等且语义为"以最后一次为准"。
 */
export async function dismissWeakSentence(
  userid: string,
  targetText: string,
): Promise<void> {
  await prisma.dismissed_pronunciation.upsert({
    where: { userid_targetText: { userid, targetText } },
    create: { userid, targetText },
    update: { dismissedAt: new Date() },
  });
}
