// yuanlu/core/learning-path/path-generate.service.ts

/**
 * [P3-h] AI 学习路径生成服务（PRO 专属）。
 *
 * 挂墙理由：LLM 调用有真实边际成本（DeepSeek 按次计费），且"AI 帮我排课"
 * 是显著的时间节省型权益；路径管理本身（创建/编辑/删除/排序）保持免费，
 * 免费用户可手动维护 1 条路径（FREE_PATH_LIMIT）。
 *
 * 生成管道：
 *   会员门禁 → 用户级频率限制（LLM 成本防护）→ 拉取已发布剧集目录 →
 *   DeepSeek（JSON mode）按主题挑剧并排序 → 校验 episodeid 白名单 →
 *   事务落库路径 + 条目。
 *
 * 防回归要点（任务清单）：
 *   - LLM 失败/无匹配 → 返回错误码，前端降级为手动创建流程，绝不阻断；
 *   - 频率限制参考词典 LLM 限流模式（模块级内存计数，尽力而为口径）；
 *   - LLM 产出的 episodeid 一律对照目录白名单过滤，杜绝注入任意 id。
 */

import prisma from "@/lib/prisma";
import { isPremiumUser } from "@/core/auth/guard";

export interface GeneratePathResult {
  ok: boolean;
  code?:
    | "PREMIUM_REQUIRED"
    | "RATE_LIMITED"
    | "LLM_UNAVAILABLE"
    | "NO_MATCH"
    | "INVALID_TOPIC";
  message?: string;
  pathid?: number;
  pathName?: string;
  itemCount?: number;
}

/** 喂给 LLM 的候选剧集上限（按发布时间倒序取最新 N 集） */
const CATALOG_MAX = 300;
const MIN_ITEMS = 3;
const MAX_ITEMS = 12;
const PATH_NAME_MAX = 100;
const DESCRIPTION_MAX = 300;
const LLM_TIMEOUT_MS = 60_000;

/** 频率限制：单用户 15s 冷却 + 每日 5 次（防连点与脚本刷 LLM） */
const GENERATE_COOLDOWN_MS = 15_000;
const GENERATE_DAILY_LIMIT = 5;
const generateHits = new Map<
  string,
  { lastAt: number; count: number; day: string }
>();

function rateAllow(userid: string): { ok: boolean; retryInSeconds?: number } {
  const now = Date.now();
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const entry = generateHits.get(userid);
  if (!entry || entry.day !== day) {
    generateHits.set(userid, { lastAt: now, count: 0, day });
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
  const entry = generateHits.get(userid);
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!entry || entry.day !== day) {
    generateHits.set(userid, { lastAt: Date.now(), count: 1, day });
  } else {
    entry.lastAt = Date.now();
    entry.count += 1;
  }
}

interface CatalogEpisode {
  episodeid: string;
  title: string;
  podcastTitle: string;
  difficulty: string;
  durationMin: number;
}

interface LlmPathPlan {
  pathName: string;
  description: string;
  episodes: string[];
}

const SYSTEM_PROMPT = `你是一位英语播客学习规划师。用户会给出一个学习主题或目标，你需要从提供的剧集目录中挑选最相关的剧集，组成一条由浅入深的学习路径。

输出严格为 JSON 对象：{"pathName": string, "description": string, "episodes": string[]}
- pathName：路径名称，中文，不超过 20 字，概括主题；
- description：路径说明，中文，一句话说明学习价值与进阶逻辑，不超过 60 字；
- episodes：episodeid 数组，按推荐学习顺序排列（先易后难/先基础后延伸），5-10 集；
- 只能使用目录中存在的 episodeid，禁止编造。若目录中相关剧集不足 3 集，返回空数组。`;

async function callLlm(
  topic: string,
  catalog: CatalogEpisode[],
): Promise<LlmPathPlan> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const modelName = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const catalogText = catalog
    .map(
      (e) =>
        `${e.episodeid}|${e.title}|${e.podcastTitle}|${e.difficulty}|${e.durationMin}min`,
    )
    .join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `<topic>${topic}</topic>\n\n<catalog>\n${catalogText}\n</catalog>`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");

    const parsed = JSON.parse(content) as Partial<LlmPathPlan>;
    if (
      typeof parsed.pathName !== "string" ||
      !Array.isArray(parsed.episodes)
    ) {
      throw new Error("Malformed LLM plan");
    }
    return {
      pathName: parsed.pathName,
      description:
        typeof parsed.description === "string" ? parsed.description : "",
      episodes: parsed.episodes.filter(
        (id): id is string => typeof id === "string",
      ),
    };
  } finally {
    clearTimeout(timer);
  }
}

export const pathGenerateService = {
  /**
   * AI 生成学习路径（PRO 专属）。成功即落库并返回 pathid；
   * 失败返回错误码，由调用方降级（前端转手动创建流程）。
   */
  async generate(
    userid: string,
    role: string | null | undefined,
    topic: string,
  ): Promise<GeneratePathResult> {
    const trimmedTopic = topic.trim().slice(0, 200);
    if (!trimmedTopic) {
      return { ok: false, code: "INVALID_TOPIC", message: "请填写学习主题" };
    }

    // 1. 会员门禁：AI 生成为 PRO 专属（LLM 真实边际成本）
    if (!(await isPremiumUser({ role, userid }))) {
      return {
        ok: false,
        code: "PREMIUM_REQUIRED",
        message: "AI 生成路径是 PRO 会员专属",
      };
    }

    // 2. 用户级频率限制（冷却期内与每日超限都拦截，不消耗 LLM 调用）
    const rate = rateAllow(userid);
    if (!rate.ok) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: rate.retryInSeconds
          ? `生成太频繁，请 ${rate.retryInSeconds} 秒后再试`
          : "今日生成次数已用完，明天再来",
      };
    }

    // 3. 剧集目录（最新已发布 N 集）
    const rawEpisodes = await prisma.episode.findMany({
      where: { status: "published" },
      select: {
        episodeid: true,
        title: true,
        difficulty: true,
        duration: true,
        podcast: { select: { title: true } },
      },
      orderBy: { publishAt: "desc" },
      take: CATALOG_MAX,
    });
    if (rawEpisodes.length < MIN_ITEMS) {
      return {
        ok: false,
        code: "NO_MATCH",
        message: "可用的剧集还不多，请先手动创建路径",
      };
    }
    const catalog: CatalogEpisode[] = rawEpisodes.map((e) => ({
      episodeid: e.episodeid,
      title: e.title,
      podcastTitle: e.podcast?.title ?? "",
      difficulty: e.difficulty ?? "General",
      durationMin: Math.max(1, Math.round((e.duration || 0) / 60)),
    }));

    // 4. LLM 生成（失败降级，不阻断）
    let plan: LlmPathPlan;
    try {
      plan = await callLlm(trimmedTopic, catalog);
    } catch (error) {
      console.error("[path-generate] LLM call failed:", error);
      return {
        ok: false,
        code: "LLM_UNAVAILABLE",
        message: "AI 生成暂时不可用，请稍后重试或手动创建",
      };
    }

    // 5. 白名单过滤 + 去重 + 截断（LLM 产出一律不信任）
    const validIds = new Set(catalog.map((e) => e.episodeid));
    const episodeids = [...new Set(plan.episodes)]
      .filter((id) => validIds.has(id))
      .slice(0, MAX_ITEMS);
    if (episodeids.length < MIN_ITEMS) {
      return {
        ok: false,
        code: "NO_MATCH",
        message: "没有找到足够相关的剧集，换个主题试试或手动创建",
      };
    }

    // 6. 落库（PRO 不限路径数，无配额检查；路径 + 条目同事务）
    const pathName =
      plan.pathName.trim().slice(0, PATH_NAME_MAX) || trimmedTopic;
    const description = plan.description.trim().slice(0, DESCRIPTION_MAX);

    recordHit(userid);

    const pathid = await prisma.$transaction(async (tx) => {
      const path = await tx.learning_paths.create({
        data: {
          userid,
          pathName,
          description: description || null,
          isPublic: false,
        },
      });
      await tx.learning_path_items.createMany({
        data: episodeids.map((episodeid, index) => ({
          pathid: path.pathid,
          episodeid,
          order: index,
        })),
      });
      return path.pathid;
    });

    return {
      ok: true,
      pathid,
      pathName,
      itemCount: episodeids.length,
    };
  },
};
