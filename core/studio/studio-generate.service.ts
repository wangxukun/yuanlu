// yuanlu/core/studio/studio-generate.service.ts

/**
 * [RESHAPE T1.4] 「心愿定制工坊」生成服务（隐形策展人）。
 *
 * 管线（对齐 RESHAPE-TASK §3.1）：
 *   会员门禁 → 用户级频率限制 → DeepSeek 意图解构 → corpus_clips 多路召回
 *   （30 条，可融合待复习生词）→ DeepSeek 精选 6 条 + 逐条点睛批注 →
 *   白名单过滤 → 落库 learning_paths（特训卡册，items 挂 clipId）→ 返回卡流。
 *
 * 挂墙与降级口径与 path-generate.service 一致：LLM 失败/无匹配返回错误码
 * （503/422），由小程序端降级，绝不阻断；LLM 产出一律不信任（白名单过滤）。
 * 全部数据读写均为新增表/新增列，网页版零扰动（§1.4）。
 */

import {
  buildRecallWhere,
  CEFR_NEIGHBORS,
  sanitizeCuration,
  sanitizeIntent,
  type CuratedCardDraft,
  type CuratorIntent,
} from "@/core/studio/curator.core";

export interface StudioGenerateInput {
  prompt: string;
  moodTag?: string | null;
  includeDueVocab?: boolean;
  focusWeakPhoneme?: boolean;
}

export interface StudioCard {
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
  /** 策展人点睛批注（第 N 秒怎么听） */
  note: string;
  /** 微互动题（跟听/捕词引导） */
  question: string;
}

export interface StudioGenerateResult {
  ok: boolean;
  code?:
    | "PREMIUM_REQUIRED"
    | "RATE_LIMITED"
    | "LLM_UNAVAILABLE"
    | "NO_MATCH"
    | "INVALID_PROMPT";
  message?: string;
  pathid?: number;
  pathName?: string;
  curatorIntro?: string;
  cards?: StudioCard[];
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

interface VocabRow {
  word: string;
}

export interface StudioGenerateDeps {
  prisma: {
    corpus_clips: {
      findMany(args: unknown): Promise<ClipRow[]>;
    };
    vocabulary: {
      findMany(args: unknown): Promise<VocabRow[]>;
    };
    learning_paths: {
      create(args: unknown): Promise<{ pathid: number }>;
    };
    learning_path_items: {
      createMany(args: unknown): Promise<{ count: number }>;
    };
  };
  isPremium(user: {
    userid: string;
    role: string | null | undefined;
  }): Promise<boolean>;
  callLlm(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number,
  ): Promise<unknown>;
}

const RECALL_LIMIT = 30;
const CARD_COUNT = 6;
const MIN_CARDS = 3;
const LLM_TIMEOUT_NOTE = "约 10-30 秒";
const GENERATE_COOLDOWN_MS = 15_000;
const GENERATE_DAILY_LIMIT = 5;

const INTENT_SYSTEM_PROMPT = `你是一位英语原声语料策展人。用户会提出一个学习心愿（场景、话题或心情），请把它解构为检索意图。

输出严格为 JSON 对象：
{"intentSummary": string, "searchKeywordsEn": string[], "searchKeywordsZh": string[], "grammarPatterns": string[], "targetCefr": string|null, "moodTone": string, "curatorIntro": string}
- intentSummary：一句话中文概括用户想学什么；
- searchKeywordsEn：英文检索词 3-6 个（地道表达/词块，小写）；
- searchKeywordsZh：中文语义检索词 2-4 个（用于匹配中文译文）；
- grammarPatterns：涉及的语法点英文短语 0-3 个；
- targetCefr：A1-A2-B1-B2-C1-C2 之一，拿不准为 null；
- moodTone：情绪基调（如 鼓励/幽默/沉静）；
- curatorIntro：以策展人口吻写给用户的开场白（中文，≤80 字，温暖、有匠心感，禁止出现"AI/人工智能/大模型"字样）。`;

const CURATION_SYSTEM_PROMPT = `你是一位挑剔的英语原声策展人。从候选原声切片（真人播客节选）中精选出最能回应学习者心愿的切片，组成一节「原声蒙太奇特训课」。

输出严格为 JSON 数组，每项：
{"clipid": string, "note": string, "question": string}
- 按「热身感知 → 核心表达 → 进阶连读」排序选 ${CARD_COUNT} 条；
- note：写给用户的点睛批注（中文，≤120 字，可引用英文原词；禁止出现"AI/人工智能/大模型"字样）；
- question：一个微互动题引导精听（中文，≤60 字）；
- 只能使用候选中的 clipid，禁止编造；不足 ${MIN_CARDS} 条合适切片时返回空数组。`;

const studioHits = new Map<
  string,
  { lastAt: number; count: number; day: string }
>();

function rateAllow(userid: string): { ok: boolean; retryInSeconds?: number } {
  const now = Date.now();
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const entry = studioHits.get(userid);
  if (!entry || entry.day !== day) {
    studioHits.set(userid, { lastAt: now, count: 0, day });
    return { ok: true };
  }
  if (now - entry.lastAt < GENERATE_COOLDOWN_MS) {
    return {
      ok: false,
      retryInSeconds: Math.ceil(
        (GENERATE_COOLDOWN_MS - (now - entry.lastAt)) / 1000,
      ),
    };
  }
  if (entry.count >= GENERATE_DAILY_LIMIT) return { ok: false };
  return { ok: true };
}

function recordHit(userid: string) {
  const entry = studioHits.get(userid);
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!entry || entry.day !== day) {
    studioHits.set(userid, { lastAt: Date.now(), count: 1, day });
  } else {
    entry.lastAt = Date.now();
    entry.count += 1;
  }
}

/** 单测隔离 */
export function _resetStudioRateLimit() {
  studioHits.clear();
}

export function createStudioGenerateService(deps: StudioGenerateDeps) {
  return {
    async generate(
      userid: string,
      role: string | null | undefined,
      input: StudioGenerateInput,
    ): Promise<StudioGenerateResult> {
      const prompt = String(input.prompt || "")
        .trim()
        .slice(0, 200);
      if (!prompt) {
        return {
          ok: false,
          code: "INVALID_PROMPT",
          message: "请先写下你的学习心愿",
        };
      }

      // 1. 会员门禁（LLM 真实边际成本，与路径生成同口径）
      if (!(await deps.isPremium({ userid, role }))) {
        return {
          ok: false,
          code: "PREMIUM_REQUIRED",
          message: "心愿定制是 PRO 会员专属",
        };
      }

      // 2. 频率限制
      const rate = rateAllow(userid);
      if (!rate.ok) {
        return {
          ok: false,
          code: "RATE_LIMITED",
          message: rate.retryInSeconds
            ? `定制太频繁，请 ${rate.retryInSeconds} 秒后再试`
            : "今日定制次数已用完，明天再来",
        };
      }

      // 3. 意图解构（LLM 步骤一）
      let intent: CuratorIntent | null = null;
      try {
        const raw = await deps.callLlm(
          [
            { role: "system", content: INTENT_SYSTEM_PROMPT },
            {
              role: "user",
              content: `<wish>${prompt}</wish>${input.moodTag ? `\n<mood>${input.moodTag}</mood>` : ""}`,
            },
          ],
          800,
        );
        const content =
          typeof raw === "string"
            ? raw
            : ((raw as { content?: string })?.content ?? "");
        const parsed = JSON.parse(String(content));
        intent = sanitizeIntent(parsed);
      } catch (error) {
        console.error("[studio-generate] intent LLM failed:", error);
        return {
          ok: false,
          code: "LLM_UNAVAILABLE",
          message: `原声策展暂时不可用，请稍后重试（${LLM_TIMEOUT_NOTE}）`,
        };
      }
      if (!intent) {
        return {
          ok: false,
          code: "LLM_UNAVAILABLE",
          message: "策展意图解析失败，请换个说法试试",
        };
      }

      // 4. 待复习生词融合（勾选「融合我生词本里待复习的词」）
      let dueVocabWords: string[] = [];
      if (input.includeDueVocab) {
        try {
          const rows = await deps.prisma.vocabulary.findMany({
            where: { userid, nextReviewAt: { lte: new Date() } },
            select: { word: true },
            take: 5,
            orderBy: { nextReviewAt: "asc" },
          });
          dueVocabWords = rows.map((r) => r.word.toLowerCase()).filter(Boolean);
        } catch {
          dueVocabWords = [];
        }
      }

      // 5. 多路召回（30 条；无关键词走难度兜底池）
      const cefrLevels = intent.targetCefr
        ? CEFR_NEIGHBORS[intent.targetCefr]
        : null;
      const where = buildRecallWhere({
        keywordsEn: intent.searchKeywordsEn,
        keywordsZh: intent.searchKeywordsZh,
        cefrLevels,
        dueVocabWords,
      });
      let candidates: ClipRow[] = [];
      try {
        candidates = await deps.prisma.corpus_clips.findMany({
          where: where ?? (cefrLevels ? { cefrLevel: { in: cefrLevels } } : {}),
          select: {
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
          },
          orderBy: { wpm: "asc" },
          take: RECALL_LIMIT,
        });
      } catch (error) {
        console.error("[studio-generate] recall failed:", error);
      }
      if (candidates.length < MIN_CARDS) {
        return {
          ok: false,
          code: "NO_MATCH",
          message: "原声语料还在准备中，稍后再来许愿",
        };
      }

      // 6. 精选编排（LLM 步骤二：挑 6 条 + 逐条批注）
      let curated: CuratedCardDraft[] = [];
      try {
        const catalogText = candidates
          .map(
            (c) =>
              `${c.clipid}|${c.cefrLevel ?? "?"}|${c.wpm}wpm|${c.enText.slice(0, 90)}|${(c.zhText || "").slice(0, 40)}`,
          )
          .join("\n");
        const raw = await deps.callLlm(
          [
            { role: "system", content: CURATION_SYSTEM_PROMPT },
            {
              role: "user",
              content: `<wish>${prompt}</wish>\n<intent>${intent.intentSummary}</intent>\n\n<candidates>\n${catalogText}\n</candidates>`,
            },
          ],
          2000,
        );
        const content =
          typeof raw === "string"
            ? raw
            : ((raw as { content?: string })?.content ?? "");
        curated = sanitizeCuration(
          JSON.parse(String(content)),
          new Set(candidates.map((c) => c.clipid)),
          CARD_COUNT,
        );
      } catch (error) {
        console.error("[studio-generate] curation LLM failed:", error);
        return {
          ok: false,
          code: "LLM_UNAVAILABLE",
          message: "原声策展暂时不可用，请稍后重试",
        };
      }
      if (curated.length < MIN_CARDS) {
        return {
          ok: false,
          code: "NO_MATCH",
          message: "没有凑齐足够贴切的原声切片，换个心愿说法试试",
        };
      }

      recordHit(userid);

      // 7. 装配卡流
      const byId = new Map(candidates.map((c) => [c.clipid, c]));
      const cards: StudioCard[] = curated.map((pick) => {
        const clip = byId.get(pick.clipid)!;
        return {
          clipid: clip.clipid,
          episodeid: clip.episodeid,
          enText: clip.enText,
          zhText: clip.zhText,
          startTime: clip.startTime,
          endTime: clip.endTime,
          duration: clip.duration,
          wpm: clip.wpm,
          cefrLevel: clip.cefrLevel,
          coverUrl: clip.coverUrl,
          sourceLabel: clip.sourceLabel,
          note: pick.note,
          question: pick.question,
        };
      });

      // 8. 落库为特训卡册（learning_paths + items；clipId 为新增可空列，网页版零感知）
      const pathName = (intent.intentSummary || prompt).slice(0, 60);
      const pathid = await deps.prisma.learning_paths.create({
        data: {
          userid,
          pathName: `心愿卡册 · ${pathName}`,
          description: (intent.curatorIntro || "").slice(0, 300) || null,
          isPublic: false,
        },
      });
      await deps.prisma.learning_path_items.createMany({
        data: cards.map((card, index) => ({
          pathid: pathid.pathid,
          episodeid: card.episodeid,
          clipId: card.clipid,
          // [T3.2] 逐卡策展批注/微互动题（蒙太奇卡册详情渲染用，可空列）
          clipNote: card.note || null,
          clipQuestion: card.question || null,
          order: index,
        })),
      });

      return {
        ok: true,
        pathid: pathid.pathid,
        pathName: `心愿卡册 · ${pathName}`,
        curatorIntro: intent.curatorIntro || intent.intentSummary,
        cards,
      };
    },
  };
}
