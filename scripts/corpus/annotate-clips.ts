// scripts/corpus/annotate-clips.ts — [M2/T2.3 stage03a] 切片 worthyScore+场景标注（4090 vLLM 过夜批）
//
// 滑窗（6 句/窗，stride 5——重叠 1 句保上下文）逐窗请求本地 vLLM（OpenAI 兼容口），
// 每窗一次产出 6 句各自的 {worthyScore, scenarioTag}；JSON 校验 + 失败重试 1 次 + 隔离；
// 断点续跑：run 目录 jsonl 已有的 clipid 跳过（重启即续，不重复烧卡）。
//
// 前置：WSL vLLM 已起（RUNBOOK 见文件尾注），.env 配 VLLM_BASE/VLLM_MODEL。
// 产出：.local/annotate/<run>/clips.jsonl（行={clipid, worthyScore, scenarioTag, modelId, pipelineVersion}）
// 落库：跑 upsert-annotations.ts（服务器/本机均可——只写已有列，additive）
// 跑法：npx tsx scripts/corpus/annotate-clips.ts --run=run1 [--limit=200]（先 --limit 冒烟）
//
// ── WSL 启动（用户侧，一次）────────────────────────────
//   conda activate vllm
//   vllm serve /home/xk/models/Qwen2.5-14B-Instruct-AWQ \
//     --served-model-name qwen25-14b-awq --port 8000 \
//     --max-model-len 8192 --gpu-memory-utilization 0.92
//   （Windows 侧连 http://127.0.0.1:8000/v1 —— WSL2 localhost 自带端口转发）
// ── .env 增补 ──────────────────────────────────────────
//   VLLM_BASE=http://127.0.0.1:8000/v1
//   VLLM_MODEL=qwen25-14b-awq
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
const PIPELINE_VERSION = "corpus-annot-v1";
const WINDOW = 6;
const STRIDE = 5;

// 受控枚举动态拼进 prompt（词表单源：core/corpus/scenario-taxonomy.ts）
import { SCENARIO_TAXONOMY } from "../../core/corpus/scenario-taxonomy";
const ENUM_TEXT = SCENARIO_TAXONOMY.map((s) => `${s.key}(${s.zh})`).join(" / ");

const SYSTEM_PROMPT = `你是英语播客语料的策展标注器。给你同一剧集里连续的 ${WINDOW} 句切片（含中译），逐句输出两个标注：
1. worthy：值得英语学习者跟读学吗？——自然完整口语句 0.7-1.0；教学讲解/叙述但自然 0.5-0.7；旁白导航（Now let's hear.../Let's recap.../Imagine you...）/广告口播/碎句罗列 0.0-0.3；
2. scenario：该句所属场景，从受控枚举选一个 key（按句子的交际场景判，不按话题词）：
${ENUM_TEXT}
输出严格 JSON：{"items":[{"i":1,"w":0.85,"s":"dining"},...]}，i=输入序号，数组必须覆盖全部 ${WINDOW} 句。只输出 JSON。`;

interface ClipRow {
  clipid: string;
  episodeid: string;
  subtitleId: number;
  enText: string;
  zhText: string | null;
}

async function callVllm(
  sentences: Array<{ i: number; en: string; zh: string }>,
): Promise<Array<{ i: number; w: number; s: string }> | null> {
  const user = sentences
    .map((x) => `${x.i}. EN: ${x.en}\n   ZH: ${x.zh}`)
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
          temperature: 0,
          max_tokens: 800,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error(`vllm ${res.status}`);
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content) as {
        items?: Array<{ i: unknown; w: unknown; s: unknown }>;
      };
      const items = (parsed.items || [])
        .filter(
          (x): x is { i: number; w: number; s: string } =>
            typeof x.i === "number" &&
            typeof x.w === "number" &&
            typeof x.s === "string" &&
            x.w >= 0 &&
            x.w <= 1,
        )
        .filter((x) => SCENARIO_TAXONOMY.some((t) => t.key === x.s));
      if (items.length === sentences.length) return items;
      throw new Error(`items ${items.length}/${sentences.length}`);
    } catch (e) {
      if (attempt === 2) {
        console.warn(
          `  ⚠ 窗口失败隔离: ${(e as Error).message?.slice(0, 80)}`,
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
  const outPath = path.join(runDir, "clips.jsonl");

  // 断点续跑：已标 clipid 集合
  const done = new Set<string>();
  if (fs.existsSync(outPath)) {
    for (const line of fs.readFileSync(outPath, "utf8").split("\n")) {
      if (line.trim()) {
        try {
          done.add((JSON.parse(line) as { clipid: string }).clipid);
        } catch {
          /* 脏行忽略 */
        }
      }
    }
  }
  const out = fs.createWriteStream(outPath, { flags: "a" });

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  console.log(
    `[annotate-clips] run=${run} 已完成 ${done.size}，枚举 ${SCENARIO_TAXONOMY.length} 个 ｜ ${VLLM_MODEL} @ ${VLLM_BASE}`,
  );

  // 逐集滑窗（按集分组保上下文连贯）
  const episodes = await prisma.corpus_clips.groupBy({ by: ["episodeid"] });
  let produced = 0;
  let windows = 0;
  let failedWindows = 0;
  const t0 = Date.now();

  outer: for (const { episodeid } of episodes) {
    const clips = await prisma.corpus_clips.findMany({
      where: { episodeid },
      select: {
        clipid: true,
        episodeid: true,
        subtitleId: true,
        enText: true,
        zhText: true,
      },
      orderBy: { subtitleId: "asc" },
    });
    const pending = clips.filter((c) => !done.has(c.clipid));
    // 窗口组并发（vLLM 批量吞吐；串行实测 78 句/min→26h 不可接受，4 并发≈4×）
    const winGroup: ClipRow[][] = [];
    for (let i = 0; i < pending.length; i += STRIDE) {
      const win: ClipRow[] = pending.slice(i, i + WINDOW);
      if (win.length) winGroup.push(win);
    }
    for (let g = 0; g < winGroup.length; g += 4) {
      const results = await Promise.all(
        winGroup.slice(g, g + 4).map(async (win) => {
          const payload = win.map((c, k) => ({
            i: k + 1,
            en: c.enText,
            zh: c.zhText || "（无译文）",
          }));
          return { win, items: await callVllm(payload) };
        }),
      );
      for (const { win, items } of results) {
        windows++;
        if (!items) {
          failedWindows++;
          continue;
        }
        for (const it of items) {
          const c = win[it.i - 1];
          if (!c) continue;
          out.write(
            JSON.stringify({
              clipid: c.clipid,
              worthyScore: Math.round(it.w * 100) / 100,
              scenarioTag: it.s,
              modelId: VLLM_MODEL,
              pipelineVersion: PIPELINE_VERSION,
            }) + "\n",
          );
          done.add(c.clipid);
          produced++;
        }
      }
      if (produced % 2000 < WINDOW * 4) {
        const rate = produced / ((Date.now() - t0) / 60000);
        console.log(
          `  已标 ${done.size} 句（+${produced} 本批，${rate.toFixed(0)} 句/min，窗失败 ${failedWindows}）`,
        );
      }
      if (limit && produced >= limit) break outer;
    }
  }
  out.end();
  console.log(
    `[annotate-clips] 完成：+${produced} 句 / ${windows} 窗（失败 ${failedWindows}）→ ${outPath}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
