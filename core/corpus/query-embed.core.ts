// yuanlu/core/corpus/query-embed.core.ts

/**
 * [M3/T3.5] 查询侧向量化——SiliconFlow 托管 BGE-M3（2026-11-08 拍板）。
 *
 * 与离线灌数（scripts/corpus/embed-corpus.ts）同模型同源：BGE-M3 多语向量空间，
 * 中文意图直接对英文 en_text 检索。30min 进程内查询缓存（金标准 50 query 只
 * 产生 50 次调用）；任何失败/超时/缺 key → 返回 null（fail-open，调用方自然
 * 回落纯关键词路——与 VECTOR_SEARCH_ON 灰度 FLAG 双保险）。
 *
 * 零 DB 依赖（纯 fetch + 缓存），semantic-search / scenes/match / eval 共用。
 */

const API_BASE =
  process.env.SILICONFLOW_BASE || "https://api.siliconflow.cn/v1";
const MODEL = process.env.SILICONFLOW_EMBED_MODEL || "BAAI/bge-m3";
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 500;
const TIMEOUT_MS = 10_000;

const cache = new Map<string, { vec: number[]; at: number }>();

/** 灰度开关：true 时调用方走向量车道（env VECTOR_SEARCH_ON=1） */
export function vectorSearchOn(): boolean {
  return process.env.VECTOR_SEARCH_ON === "1";
}

/** 查询文本 → 1024 维向量；fail-open null（缺 key/网络/超时/维度异常） */
export async function embedQuery(text: string): Promise<number[] | null> {
  const q = String(text || "")
    .trim()
    .slice(0, 300);
  if (!q) return null;
  const hit = cache.get(q);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.vec;

  const key = process.env.SILICONFLOW_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({ model: MODEL, input: [q] }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const vec = json.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length !== 1024) return null;
    if (cache.size >= CACHE_MAX) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    cache.set(q, { vec, at: Date.now() });
    return vec;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
