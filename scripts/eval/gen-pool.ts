// scripts/eval/gen-pool.ts — T2.1① 池化候选生成 + 关键词路基线入档
//
// 复刻 /api/scenes/match 的召回管线（DeepSeek 双语扩词 → 多车道 OR 召回 →
// isJunkClip/红线词过滤 → rankSemanticClips），唯一差异：limit 4 → 30（池化）。
// 产出（.local/eval/）：
//   queries-gold.csv    — 50 query × top-30 候选（rank/clipid/难度/双语/空标注列）
//   baseline-recall.json — 每条 query 的扩词 + top-10 归档（标注完成后按此算 Recall@10 基线；
//                          M3 向量管线的 top-30 之后并入同池再算向量版，同池可比）
// 跑法：npx tsx scripts/eval/gen-pool.ts（50 次 DeepSeek 首跑约 3-5 分钟）
import * as fs from "node:fs";
import * as path from "node:path";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import { EVAL_QUERIES } from "./queries";
import { isJunkClip, rankSemanticClips } from "../../core/studio/curator.core";
import { hasSensitiveTerm } from "../../core/corpus/clip-core";

const LLM_TIMEOUT_MS = 20_000;
const POOL_LIMIT = 30;
const SYSTEM_PROMPT = `你是英语场景检索助手。用户给出一个中文场景或学习意图，你产出双语检索词用于语料库检索。
输出严格为 JSON 对象：{"phrases": string[], "zhWords": string[]}
- phrases：3-5 个英文短语，每个 1-4 个单词，全部小写；覆盖该场景的不同常见说法（如预约可以说 make an appointment / book a table / schedule a call）；只输出高频自然表达，禁止编造生僻词；
- zhWords：2-6 个中文内容词（该场景的关键名词/动词，如「面试」「缺点」「点单」「买票」「寒暄」），用于中文译文检索；禁止虚词与单字。`;

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "for",
  "of",
  "in",
  "on",
  "at",
  "by",
  "with",
  "about",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "can",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "must",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "this",
  "that",
  "these",
  "those",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "me",
  "him",
  "us",
  "them",
  "what",
  "which",
  "who",
  "whom",
  "how",
  "when",
  "where",
  "why",
  "not",
  "no",
  "yes",
  "and",
  "or",
  "but",
  "if",
  "because",
  "so",
  "than",
  "too",
  "very",
  "just",
  "also",
  "am",
  "bit",
  "sure",
  "let",
  "lets",
  "going",
  "gonna",
  "us",
]);
const WEAK_WORDS = new Set([
  "time",
  "call",
  "check",
  "day",
  "way",
  "thing",
  "things",
  "people",
  "good",
  "great",
  "help",
  "next",
  "small",
  "large",
  "every",
  "today",
  "word",
  "words",
  "sentence",
  "sentences",
  "english",
  "listening",
  "speak",
  "talk",
  "quiz",
  "name",
  "part",
  "place",
  "first",
  "right",
]);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function phraseContentWords(phrase: string): string[] {
  return phrase
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !WEAK_WORDS.has(w));
}
function zhGrams(q: string): string[] {
  if (!/^[\u4e00-\u9fa5\s]+$/.test(q)) return [];
  const grams: string[] = [];
  for (let i = 0; i < q.length - 1; i++) {
    const g = q.slice(i, i + 2);
    if (!grams.includes(g)) grams.push(g);
  }
  return grams.slice(0, 6);
}

const phraseCache = new Map<string, { phrases: string[]; zhWords: string[] }>();

async function expand(
  q: string,
): Promise<{ phrases: string[]; zhWords: string[] }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return { phrases: [], zhWords: [] };
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `<scene>${q}</scene>` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 400,
      }),
    });
    if (!res.ok) return { phrases: [], zhWords: [] };
    const result = await res.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return { phrases: [], zhWords: [] };
    const parsed = JSON.parse(content) as {
      phrases?: unknown;
      zhWords?: unknown;
    };
    const phrases = (Array.isArray(parsed.phrases) ? parsed.phrases : [])
      .filter(
        (p): p is string =>
          typeof p === "string" &&
          p.trim().length >= 2 &&
          p.trim().length <= 40,
      )
      .map((p) => p.trim().toLowerCase())
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .slice(0, 5);
    const zhWords = (Array.isArray(parsed.zhWords) ? parsed.zhWords : [])
      .filter(
        (w): w is string =>
          typeof w === "string" && /^[\u4e00-\u9fa5]{2,8}$/.test(w.trim()),
      )
      .map((w) => w.trim())
      .filter((w, i, arr) => arr.indexOf(w) === i)
      .slice(0, 6);
    return { phrases, zhWords };
  } catch {
    return { phrases: [], zhWords: [] };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const outDir = path.join(process.cwd(), ".local", "eval");
  fs.mkdirSync(outDir, { recursive: true });

  const csvRows: string[] = [
    "query_id,query,category,rank,clipid,difficulty,wpm,enText,zhText,标注(相关/不相关/不确定),备注",
  ];
  const baseline: unknown[] = [];
  const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;

  for (const { id, q, category, note } of EVAL_QUERIES) {
    let phrases = phraseCache.get(q)?.phrases;
    let zhWords = phraseCache.get(q)?.zhWords;
    if (!phrases) {
      const r = await expand(q);
      phrases = r.phrases;
      zhWords = r.zhWords;
      phraseCache.set(q, { phrases, zhWords });
    }
    const keywords: string[] = [];
    phrases!.map(phraseContentWords).forEach((ws) =>
      ws.forEach((w) => {
        if (!keywords.includes(w)) keywords.push(w);
      }),
    );
    const grams = zhGrams(q);

    const rows = await prisma.corpus_clips.findMany({
      where: {
        // Json 列非 DB NULL 的 Prisma 写法（{ not: null } 编译不过——已知坑）
        wordsJson: { not: (await import("@prisma/client")).Prisma.DbNull },
        zhText: { not: null },
        OR: [
          ...phrases!.map((p) => ({
            enText: { contains: p, mode: "insensitive" as const },
          })),
          ...keywords.map((k) => ({
            enText: { contains: k, mode: "insensitive" as const },
          })),
          { zhText: { contains: q } },
          ...zhWords!.map((w) => ({ zhText: { contains: w } })),
          ...grams.map((g) => ({ zhText: { contains: g } })),
        ],
      },
      select: {
        clipid: true,
        episodeid: true,
        subtitleId: true,
        enText: true,
        zhText: true,
        wpm: true,
        cefrLevel: true,
        duration: true,
      },
      orderBy: { wpm: "asc" },
      take: 300,
    });
    const wbHit = (hay: string, needle: string) =>
      new RegExp(`\\b${escapeRe(needle)}\\b`, "i").test(hay);
    const usable = rows.filter(
      (r) =>
        !isJunkClip({ enText: r.enText, duration: r.duration, wpm: r.wpm }) &&
        !hasSensitiveTerm(r.enText) &&
        !hasSensitiveTerm(r.zhText) &&
        (phrases!.some((p) => wbHit(r.enText, p)) ||
          keywords.some((k) => wbHit(r.enText, k)) ||
          !!(r.zhText && r.zhText.includes(q)) ||
          zhWords!.some((w) => r.zhText!.includes(w)) ||
          grams.some((g) => r.zhText!.includes(g))),
    );
    const picked = rankSemanticClips(usable, POOL_LIMIT, {
      phrases: phrases!,
      perPhraseWords: phrases!.map(phraseContentWords),
      query: q,
      grams: [...zhWords!, ...grams],
    });

    picked.forEach((r, i) => {
      csvRows.push(
        [
          id,
          esc(q),
          esc(category),
          i + 1,
          r.clipid,
          r.cefrLevel || "",
          r.wpm || "",
          esc(r.enText),
          esc(r.zhText),
          "",
          note ? esc(`#${note}`) : "",
        ].join(","),
      );
    });
    baseline.push({
      qid: id,
      q,
      category,
      note: note || null,
      phrases: phrases!,
      zhWords: zhWords!,
      pool_size: picked.length,
      top10: picked.slice(0, 10).map((r) => r.clipid),
      top30: picked.map((r) => r.clipid),
    });
    console.log(
      `#${id} [${category}] ${q} → 池 ${picked.length}${note ? ` (${note})` : ""}`,
    );
  }

  fs.writeFileSync(
    path.join(outDir, "queries-gold.csv"),
    "\uFEFF" + csvRows.join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(outDir, "baseline-recall.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        pipeline:
          "keyword-lane v1（DeepSeek phrases+zhWords 多车道 + rankSemanticClips；镜像 /api/scenes/match，limit=30）",
        corpus: "M0 重灌后 110,528 条",
        queries: baseline,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    `\n产出：queries-gold.csv（${csvRows.length - 1} 行候选）+ baseline-recall.json → .local/eval/`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
