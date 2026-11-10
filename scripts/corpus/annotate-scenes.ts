// scripts/corpus/annotate-scenes.ts — [M2/T2.3 stage03b] 场景身份重建（title/summaryZh/scenarioTag）
//
// 输入：micro_scenes.clipsJson（句级双语+词级时间戳）+ clips.jsonl 的句级 scenarioTag 多数票（可选辅助）
// 输出：.local/annotate/<run>/scenes.jsonl（行={sceneKey, title, summaryZh, scenarioTag}）
// 落库：upsert-annotations.ts（UPDATE title/summaryZh/situationTag——按 sceneKey 稳定键，sceneid 不动）
// 前置：同 annotate-clips（vLLM 起）；建议 clips 标注完成后跑（多数票更好），也可独立跑。
// 跑法：npx tsx scripts/corpus/annotate-scenes.ts --run=run1 [--limit=50]
import * as fs from "node:fs";
import * as path from "node:path";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const VLLM_BASE = process.env.VLLM_BASE || "http://127.0.0.1:8000/v1";
const VLLM_MODEL = process.env.VLLM_MODEL || "qwen25-14b-awq";

import { SCENARIO_TAXONOMY } from "../../core/corpus/scenario-taxonomy";
const ENUM_TEXT = SCENARIO_TAXONOMY.map((s) => `${s.key}(${s.zh})`).join(" / ");

const SYSTEM_PROMPT = `你是英语学习产品的场景策展人。给你一段 3-6 句的连续播客切片（含中译），为它生成「场景身份」三件套：
1. title：场景化中文标题，≤18 字，描述这是什么交际场景（如「咖啡店偶遇朋友寒暄」「机场值机行李超重交涉」）——禁止照抄第一句译文；
2. summaryZh：30-60 字场景导读，说明学习者在此场景能学到什么（如语气、句式、文化点），自然中文，不列点；
3. scenarioTag：受控枚举选一个 key：
${ENUM_TEXT}
输出严格 JSON：{"title":"...","summaryZh":"...","scenarioTag":"..."}。只输出 JSON。`;

interface SceneRow {
  sceneKey: string;
  sentences: Array<{ en: string; zh: string }>;
}

async function callVllm(
  s: SceneRow,
): Promise<{ title: string; summaryZh: string; scenarioTag: string } | null> {
  const user = s.sentences
    .map((x, i) => `${i + 1}. EN: ${x.en}\n   ZH: ${x.zh}`)
    .join("\n");
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await fetch(`${VLLM_BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: VLLM_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: user },
          ],
          temperature: 0.2,
          max_tokens: 500,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error(`vllm ${res.status}`);
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const parsed = JSON.parse(
        json.choices?.[0]?.message?.content || "{}",
      ) as {
        title?: unknown;
        summaryZh?: unknown;
        scenarioTag?: unknown;
      };
      const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
      const summaryZh =
        typeof parsed.summaryZh === "string" ? parsed.summaryZh.trim() : "";
      const scenarioTag =
        typeof parsed.scenarioTag === "string" ? parsed.scenarioTag.trim() : "";
      if (
        !title ||
        title.length > 24 ||
        !summaryZh ||
        summaryZh.length < 15 ||
        !SCENARIO_TAXONOMY.some((t) => t.key === scenarioTag)
      ) {
        throw new Error("字段校验不过");
      }
      // 红线词防线（标题/导读不得带 AI/播客等——合规口径）
      if (/AI|人工智能|播客/i.test(title + summaryZh))
        throw new Error("红线词");
      return { title, summaryZh, scenarioTag };
    } catch (e) {
      if (attempt === 2) {
        console.warn(
          `  ⚠ 场景失败隔离 ${s.sceneKey}: ${(e as Error).message?.slice(0, 60)}`,
        );
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000));
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function parseArgs() {
  const run = (
    process.argv.find((a) => a.startsWith("--run=")) || "--run=run1"
  ).slice(6);
  const lim = process.argv.find((a) => a.startsWith("--limit="));
  return { run, limit: lim ? Number(lim.slice(8)) || 0 : 0 };
}

async function main() {
  const { run, limit } = parseArgs();
  const runDir = path.join(process.cwd(), ".local", "annotate", run);
  fs.mkdirSync(runDir, { recursive: true });
  const outPath = path.join(runDir, "scenes.jsonl");
  const done = new Set<string>();
  if (fs.existsSync(outPath)) {
    for (const line of fs.readFileSync(outPath, "utf8").split("\n")) {
      if (line.trim()) {
        try {
          done.add((JSON.parse(line) as { sceneKey: string }).sceneKey);
        } catch {
          /* 忽略 */
        }
      }
    }
  }
  const out = fs.createWriteStream(outPath, { flags: "a" });

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const scenes = await prisma.micro_scenes.findMany({
    select: { sceneKey: true, clipsJson: true },
    orderBy: { sceneKey: "asc" },
  });
  console.log(
    `[annotate-scenes] run=${run} 场景 ${scenes.length}，已完成 ${done.size}`,
  );

  let produced = 0,
    failed = 0;
  for (const sc of scenes) {
    if (done.has(sc.sceneKey)) continue;
    const clips =
      (
        sc.clipsJson as {
          clips?: Array<{ textEn?: string; textCn?: string | null }>;
        } | null
      )?.clips || [];
    const sentences = clips
      .filter((c) => c.textEn)
      .map((c) => ({ en: c.textEn as string, zh: c.textCn || "（无译文）" }));
    if (sentences.length < 2) continue;
    const r = await callVllm({ sceneKey: sc.sceneKey, sentences });
    if (r) {
      out.write(JSON.stringify({ sceneKey: sc.sceneKey, ...r }) + "\n");
      done.add(sc.sceneKey);
      produced++;
    } else failed++;
    if (produced % 1000 === 0 && produced > 0)
      console.log(`  已产 ${produced}（失败 ${failed}）`);
    if (limit && produced >= limit) break;
  }
  out.end();
  console.log(
    `[annotate-scenes] 完成：+${produced} / 失败 ${failed} → ${outPath}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
