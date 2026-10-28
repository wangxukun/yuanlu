// yuanlu/core/studio/daily-prescription.service.ts

/**
 * [RESHAPE T1.4] 「今日五分钟 · 双螺旋靶向处方」服务。
 *
 * 零手动输入，打开即练（对齐 RESHAPE-TASK §3.4）：
 *   第 1–2 卡 跨语境生词重逢：待复习生词（isDue）在 corpus_clips 中检索
 *             另一语境的原声句（排除原出处剧集，多语境刺激记忆）；
 *   第 3–4 卡 弱音靶向狙击：user_profile.phonemeStats 最弱 2 音素 →
 *             phonemeTags 命中的原声金句；
 *   第 5 卡   今日微剧场：最新微场景切片。
 *
 * 装配逻辑（assemblePrescription）在 curator.core 纯函数中，单测直测；
 * 本服务只做取数与映射。全部只读既有/新增表，网页版零扰动。
 */

import {
  assemblePrescription,
  topWeakPhonemes,
  type PrescriptionCard,
} from "@/core/studio/curator.core";

export interface DailyPrescriptionResult {
  ok: boolean;
  code?: "NOT_READY";
  message?: string;
  cards?: PrescriptionCard[];
}

interface ClipRow {
  clipid: string;
  episodeid: string;
  enText: string;
  zhText: string | null;
  startTime: number;
  endTime: number;
  duration: number;
  wpm: number;
  cefrLevel: string | null;
  coverUrl: string | null;
  sourceLabel: string | null;
}

interface SceneRow {
  sceneid: string;
  title: string;
  situationTag: string | null;
  cefrLevel: string | null;
  coverUrl: string | null;
  duration: number;
  summaryZh: string | null;
}

export interface DailyPrescriptionDeps {
  prisma: {
    vocabulary: {
      findMany(
        args: unknown,
      ): Promise<Array<{ word: string; episodeid: string | null }>>;
    };
    corpus_clips: {
      findMany(args: unknown): Promise<ClipRow[]>;
    };
    micro_scenes: {
      findMany(args: unknown): Promise<SceneRow[]>;
    };
    user_profile: {
      findUnique(args: unknown): Promise<{ phonemeStats: unknown } | null>;
    };
  };
  now?: () => Date;
}

const CLIP_SELECT = {
  clipid: true,
  episodeid: true,
  enText: true,
  zhText: true,
  startTime: true,
  endTime: true,
  duration: true,
  wpm: true,
  cefrLevel: true,
  coverUrl: true,
  sourceLabel: true,
};

export function createDailyPrescriptionService(deps: DailyPrescriptionDeps) {
  return {
    async build(userid: string): Promise<DailyPrescriptionResult> {
      const now = (deps.now ?? (() => new Date()))();

      // 第 1–2 卡数据源：待复习生词 + 各词的跨语境原声句
      const dueVocab = await deps.prisma.vocabulary
        .findMany({
          where: { userid, nextReviewAt: { lte: now } },
          select: { word: true, episodeid: true },
          orderBy: { nextReviewAt: "asc" },
          take: 2,
        })
        .catch(() => [] as Array<{ word: string; episodeid: string | null }>);

      const clipsByWord: Record<string, ClipRow[]> = {};
      for (const vocab of dueVocab) {
        const rows = await deps.prisma.corpus_clips.findMany({
          where: {
            enText: { contains: vocab.word, mode: "insensitive" },
            // 跨语境重逢：排除当初记下这个词的剧集（无出处则不排除）
            ...(vocab.episodeid ? { episodeid: { not: vocab.episodeid } } : {}),
          },
          select: CLIP_SELECT,
          orderBy: { wpm: "asc" },
          take: 2,
        });
        if (rows.length > 0) clipsByWord[vocab.word] = rows;
      }

      // 第 3–4 卡数据源：薄弱音素画像 + 命中音素标签的原声金句
      const profile = await deps.prisma.user_profile
        .findUnique({ where: { userid }, select: { phonemeStats: true } })
        .catch(() => null);
      const weakPhonemes = topWeakPhonemes(profile?.phonemeStats, 2);

      const clipsByPhoneme: Record<string, ClipRow[]> = {};
      for (const phoneme of weakPhonemes) {
        const rows = await deps.prisma.corpus_clips.findMany({
          where: { phonemeTags: { has: phoneme } },
          select: CLIP_SELECT,
          orderBy: { wpm: "asc" },
          take: 2,
        });
        if (rows.length > 0) clipsByPhoneme[phoneme] = rows;
      }

      // 第 5 卡：最新微剧场
      const sceneRows = await deps.prisma.micro_scenes
        .findMany({
          select: {
            sceneid: true,
            title: true,
            situationTag: true,
            cefrLevel: true,
            coverUrl: true,
            duration: true,
            summaryZh: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        })
        .catch(() => [] as SceneRow[]);
      const scene = sceneRows[0] || null;

      const { cards, partial } = assemblePrescription({
        dueVocab,
        clipsByWord,
        weakPhonemes,
        clipsByPhoneme,
        scene,
      });

      if (cards.length === 0) {
        return {
          ok: false,
          code: "NOT_READY",
          message: "今日处方还在备料，先去复习中心逛逛",
        };
      }
      return { ok: true, cards, ...(partial ? {} : {}) };
    },
  };
}
