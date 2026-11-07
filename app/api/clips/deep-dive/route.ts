import { NextResponse } from "next/server";
import { authWithMobile } from "@/core/auth/guard";
import { anonymousLlmRateAllow } from "@/lib/dictionary-quota";

/**
 * [REELS] POST /api/clips/deep-dive — 原声微流·句级语言学深度透视。
 *
 * Body: { sentence, targetWord? } → 200 { success, data: {
 *   connectedSpeech, toneAndMood, paraphrase, speakingTip, source } }
 * source: "llm"（DeepSeek 实析）| "fallback"（固定兜底文案）。
 *
 * 成本防线对齐 semantic-search：30min 进程内句级缓存（命中不计数）；
 * 未命中时游客按 IP 日限（复用词典匿名限流）、登录用户 10s 冷却；
 * LLM 任何失败/超时/字段校验不过 → 固定兜底文案（B 原型降级路径同款，
 * 恒 200 不抛错——透视按钮永远有内容可看）。
 */
const LLM_TIMEOUT_MS = 20_000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 300;
const USER_COOLDOWN_MS = 10_000;

const SYSTEM_PROMPT = `你是顶级的英语语流教练，专注播客原声的连读现象与语用分析。分析给定的英文原生句子，输出严格 JSON 对象：
{"connectedSpeech": string, "toneAndMood": string, "paraphrase": string, "speakingTip": string}
- connectedSpeech：连读/同化/弱读的具体细节说明，精准标注到具体单词交界处；
- toneAndMood：说话者的语气、情感倾向及适用场合；
- paraphrase：母语者口语中另外两种完全同义的地道替换说法；
- speakingTip：学习者如何发音才能避免中式生硬腔调。
每字段中文 40-100 字，不得输出 JSON 以外的任何内容。`;

/** LLM 不可用时的固定兜底（B工程 server 无 key 降级路径，一字不差） */
const FALLBACK_ANALYSIS = {
  connectedSpeech: "辅音结尾与元音开头发生顺滑连读，介词与弱读代词轻读降调。",
  toneAndMood: "自信、从容且具有说服力的交际语调，常见于播客访谈与商务交流。",
  paraphrase: "可替换为更加通俗的日常口语表述，或更加严谨的书面用词。",
  speakingTip: "注意喉头放松，腹式呼吸送气，重点实词重读，虚词快速带过。",
};

interface Analysis {
  connectedSpeech: string;
  toneAndMood: string;
  paraphrase: string;
  speakingTip: string;
}

const cache = new Map<string, { analysis: Analysis; at: number }>();
const userHits = new Map<string, number>();

function cacheKey(sentence: string, targetWord: string): string {
  return targetWord ? `${sentence}::${targetWord}` : sentence;
}

function isValidAnalysis(a: unknown): a is Analysis {
  if (!a || typeof a !== "object") return false;
  const x = a as Record<string, unknown>;
  return ["connectedSpeech", "toneAndMood", "paraphrase", "speakingTip"].every(
    (k) => typeof x[k] === "string" && (x[k] as string).trim().length >= 8,
  );
}

async function analyze(
  sentence: string,
  targetWord: string,
): Promise<Analysis | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const modelName = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const user = `<sentence>${sentence}</sentence>${
      targetWord ? `<focus_word>${targetWord}</focus_word>` : ""
    }`;
    const res = await fetch(`${baseUrl}/chat/completions`, {
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
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 600,
      }),
    });
    if (!res.ok) return null;
    const result = await res.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as unknown;
    if (!isValidAnalysis(parsed)) return null;
    return {
      connectedSpeech: parsed.connectedSpeech.trim(),
      toneAndMood: parsed.toneAndMood.trim(),
      paraphrase: parsed.paraphrase.trim(),
      speakingTip: parsed.speakingTip.trim(),
    };
  } catch {
    return null; // 超时/网络/解析失败 → 兜底
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      sentence?: unknown;
      targetWord?: unknown;
    } | null;
    const sentence = String(body?.sentence ?? "")
      .trim()
      .slice(0, 300);
    const targetWord = String(body?.targetWord ?? "")
      .trim()
      .slice(0, 40);
    if (!sentence) {
      return NextResponse.json(
        { success: false, error: "Missing sentence" },
        { status: 400 },
      );
    }

    const key = cacheKey(sentence, targetWord);

    // 成本防线：缓存命中直接回（不计数）；未命中按身份限流
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        data: { ...cached.analysis, source: "llm" },
      });
    }

    const session = await authWithMobile().catch(() => null);
    if (session?.user?.userid) {
      const last = userHits.get(session.user.userid) || 0;
      if (Date.now() - last < USER_COOLDOWN_MS) {
        // 冷却中不调 LLM，但保证体验：直接兜底（不作为错误）
        return NextResponse.json({
          success: true,
          data: { ...FALLBACK_ANALYSIS, source: "fallback" },
        });
      }
      userHits.set(session.user.userid, Date.now());
    } else {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
      if (!anonymousLlmRateAllow(ip)) {
        return NextResponse.json({
          success: true,
          data: { ...FALLBACK_ANALYSIS, source: "fallback" },
        });
      }
    }

    const analysis = await analyze(sentence, targetWord);
    if (!analysis) {
      return NextResponse.json({
        success: true,
        data: { ...FALLBACK_ANALYSIS, source: "fallback" },
      });
    }

    if (cache.size >= CACHE_MAX) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(key, { analysis, at: Date.now() });

    return NextResponse.json({
      success: true,
      data: { ...analysis, source: "llm" },
    });
  } catch (error) {
    console.error("[POST /api/clips/deep-dive]", error);
    return NextResponse.json(
      { success: false, error: "Deep dive failed" },
      { status: 500 },
    );
  }
}
