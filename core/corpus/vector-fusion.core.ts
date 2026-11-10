// yuanlu/core/corpus/vector-fusion.core.ts

/**
 * [M3/T3.1] 三路融合·向量车道装配（FLAG 门控，2026-11-08）。
 *
 * 设计约束：
 *   - 不改 curator.core 内部（rankSemanticClips/scoreSemanticClip 原样复用，
 *     融合在调用侧组合——证据分 + 向量相似度加权）；
 *   - fail-open 三层保险：FLAG 关 → 纯关键词；FLAG 开但 embedQuery null（缺
 *     key/超时）→ 纯关键词；向量近邻空（未灌数）→ 纯关键词；
 *   - 补召回：向量命中但关键词未召回的行回库补拉，过同一 junk/敏感词门禁后
 *     并入候选池（池化评估口径：两路召回并池，Recall 才公平）。
 *   - [2026-11-10] 向量 veto：向量路可用时，不在 top-60 近邻中的候选
 *     证据分半降（×0.5）——治「关键词碰撞但语义不相关」的结构性问题。
 *     向量路不可用时 veto 不生效（fail-open 到纯证据分）。
 *
 * 权重量纲：scoreSemanticClip 的词块命中 +40 / 共现 +12 / 中文完整 +25；
 * 向量分 W_VEC=35：sim 0.6 ≈ +21（强信号但不压倒多证据词块命中）。
 * veto 系数 VETO_FACTOR=0.5：KW-only 候选证据分 75 → 37.5（掉出 top-4）。
 */
import {
  scoreSemanticClip,
  type SemanticRankContext,
} from "@/core/studio/curator.core";
import { clipEmbeddingRepo } from "@/core/corpus/clip-embedding.repo";
import { embedQuery, vectorSearchOn } from "@/core/corpus/query-embed.core";

/** 向量车道权重（2026-11-09 调参矩阵定标：35 饱和最优；relabel 正本口径 R@10=49.5%） */
export const VECTOR_LANE_WEIGHT = 35;
/**
 * 向量补召回相似度下限——【0.526 以下恒惰性】：50 query × top60 近邻实测全局最小
 * sim=0.526（[0.3,0.45) 带内零条），故 0.3/0.4/0.45 三档等价；0.55 有 +1.2pp 微增益
 * （46 query 样本下属噪声级）、0.65 起切进有效带明显伤害（39.6%）。维持 0.3 惰性档。
 */
export const VECTOR_MIN_SIM = 0.3;
/**
 * [2026-11-10] 向量 veto 系数——向量路可用但候选不在 top-60 近邻集时，
 * 证据分乘以此系数。0.5 = 半降（75→37.5，掉出 top-4）；1 = 禁用 veto。
 * 设计意图：关键词碰撞句（如「餐厅点单」对「咖啡厅点单闲聊」）的证据分
 * 在无语义佐证时应打折——不然一个 "order" 词块命中 +40 就能排第 4。
 */
export const VECTOR_VETO_FACTOR = 0.5;

/** 融合候选行基型（两路由的 CLIP_SELECT 行均结构兼容） */
export interface FusionRow {
  clipid: string;
  episodeid: string;
  enText: string;
  zhText?: string | null;
  wpm?: number | null;
}

export interface VectorFuseParams<Row extends FusionRow> {
  query: string;
  /** 关键词路已过门禁的候选行 */
  usable: Row[];
  /** 关键词路排序上下文（phrases/perPhraseWords/query/grams） */
  rankCtx: SemanticRankContext;
  limit: number;
  /** 向量补召回行的回库拉取（调用方注入 prisma select，保持各路由字段一致） */
  fetchByClipIds: (clipids: string[]) => Promise<Row[]>;
  /** 补召回行的门禁复检（junk/敏感词——与关键词路同口径） */
  isEligible: (row: Row) => boolean;
  perEpisodeCap?: number;
}

/**
 * 融合排序：scoreSemanticClip(证据分) + sim×W_VEC(向量分)，
 * 每集配额（默认 2）+ 同分慢速优先——与 rankSemanticClips 挑选口径一致。
 *
 * [veto 机制] 向量路成功启用时，不在 top-60 近邻集的候选证据分半降
 * （×VECTOR_VETO_FACTOR）——关键词碰撞句的「证据」无语义佐证时打折。
 * 向量路不可用（FLAG 关/缺 key/超时）→ veto 不生效（fail-open 到纯证据分）。
 */
export async function fuseRankClips<Row extends FusionRow>(
  params: VectorFuseParams<Row>,
): Promise<Row[]> {
  const { query, usable, rankCtx, limit, fetchByClipIds, isEligible } = params;
  const cap = params.perEpisodeCap ?? 2;

  const vectorSim = new Map<string, number>();
  let vectorActive = false;
  if (vectorSearchOn()) {
    const qv = await embedQuery(query);
    if (qv) {
      vectorActive = true;
      const hits = await clipEmbeddingRepo.nearestClips(qv, 60);
      const usableIds = new Set(usable.map((r) => r.clipid));
      for (const h of hits) {
        if (h.similarity >= VECTOR_MIN_SIM) vectorSim.set(h.id, h.similarity);
      }
      // 补召回：向量命中 + 未被关键词召回 + 达相似度阈 → 回库拉取并过门禁
      const missing = [...vectorSim.keys()].filter((id) => !usableIds.has(id));
      if (missing.length > 0) {
        const extra = await fetchByClipIds(missing.slice(0, 40));
        for (const r of extra) {
          if (
            isEligible(r) &&
            (vectorSim.get(r.clipid) ?? 0) >= VECTOR_MIN_SIM
          ) {
            usable.push(r);
          }
        }
      }
    }
  }

  const scored = usable
    .map((r) => {
      const evScore = scoreSemanticClip(r, rankCtx);
      const vScore = (vectorSim.get(r.clipid) ?? 0) * VECTOR_LANE_WEIGHT;
      // 向量 veto：向量路可用但候选不在近邻集 → 证据分半降
      // （关键词碰撞句的「证据」无语义佐证时打折；向量路不可用时不生效）
      const veto =
        vectorActive && !vectorSim.has(r.clipid) ? VECTOR_VETO_FACTOR : 1;
      return { r, s: evScore * veto + vScore };
    })
    .filter((x) => Number.isFinite(x.s))
    .sort((a, b) => {
      if (b.s !== a.s) return b.s - a.s;
      return (Number(a.r.wpm) || 999) - (Number(b.r.wpm) || 999);
    });

  const perEpisode = new Map<string, number>();
  const picked: Row[] = [];
  for (const { r } of scored) {
    const n = perEpisode.get(r.episodeid) || 0;
    if (n >= cap) continue;
    perEpisode.set(r.episodeid, n + 1);
    picked.push(r);
    if (picked.length >= limit) break;
  }
  return picked;
}
