// yuanlu/core/corpus/clip-embedding.repo.ts

/**
 * [M1/T1.4] pgvector 读写仓库（vector(1024) 列 Prisma Unsupported，全走
 * $queryRaw/$executeRaw）。M2 灌数（05_embed 产出）写入，M3 三路检索消费。
 *
 * 职责：
 *   - 写入：clips.en_text 路 / scenes.zh_scene 路（批量 upsert，M2 06_upsert 调用）
 *   - 检索：余弦近邻（HNSW 索引，毫秒级）——三路融合中的向量路
 *     （向量分与关键词证据分在 curator.rankSemanticClips 统一融合，本仓库只出近邻）
 *
 * 注意：
 *   - 向量以字符串 '[1,2,...]' 绑定后 ::vector 强转（参数化安全，无注入面）
 *   - 查询侧 embedding（用户意图向量化，T3.5 选型后接入）同用 nearest* 接口
 *   - 未灌数时（列全空）查询返回空数组——调用方自然回落关键词路（FLAG 语义）
 */
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface VectorHit {
  id: string;
  /** 余弦相似度 0–1（pgvector cosine distance → 1 - distance） */
  similarity: number;
}

/** number[] → pgvector 字面量（定点 6 位，BGE-M3 输出精度足够且省传输） */
function toVectorLiteral(vec: number[]): string {
  return `[${vec.map((v) => (Number.isFinite(v) ? v.toFixed(6) : "0")).join(",")}]`;
}

export const clipEmbeddingRepo = {
  /** clips.en_text 路批量写入（按 clipid upsert 覆盖） */
  async upsertClipEmbeddings(
    rows: Array<{ clipid: string; embedding: number[] }>,
  ): Promise<number> {
    if (!rows.length) return 0;
    const values = rows.map(
      (r) => Prisma.sql`(${r.clipid}, ${toVectorLiteral(r.embedding)}::vector)`,
    );
    // ON CONFLICT 走主键；embedding 全量覆盖（幂等重灌语义）
    const res = await prisma.$executeRaw`
      UPDATE "corpus_clips" AS c
      SET "embedding" = v.embedding
      FROM (VALUES ${Prisma.join(values)}) AS v(clipid, embedding)
      WHERE c."clipid" = v.clipid`;
    return res;
  },

  /** scenes.zh_scene 路批量写入（按 sceneid） */
  async upsertSceneEmbeddings(
    rows: Array<{ sceneid: string; embedding: number[] }>,
  ): Promise<number> {
    if (!rows.length) return 0;
    const values = rows.map(
      (r) =>
        Prisma.sql`(${r.sceneid}, ${toVectorLiteral(r.embedding)}::vector)`,
    );
    return prisma.$executeRaw`
      UPDATE "micro_scenes" AS s
      SET "embeddingZh" = v.embedding
      FROM (VALUES ${Prisma.join(values)}) AS v(sceneid, embedding)
      WHERE s."sceneid" = v.sceneid`;
  },

  /** en_text 近邻（单句切片路） */
  async nearestClips(vec: number[], limit = 12): Promise<VectorHit[]> {
    return prisma.$queryRaw<VectorHit[]>`
      SELECT "clipid" AS id, 1 - ("embedding" <=> ${toVectorLiteral(vec)}::vector) AS similarity
      FROM "corpus_clips"
      WHERE "embedding" IS NOT NULL
      ORDER BY "embedding" <=> ${toVectorLiteral(vec)}::vector
      LIMIT ${Math.min(100, Math.max(1, limit))}
    `;
  },

  /** zh_scene 近邻（微场景路：命中场景 → 调用方展开场景内 clips） */
  async nearestScenes(vec: number[], limit = 8): Promise<VectorHit[]> {
    return prisma.$queryRaw<VectorHit[]>`
      SELECT "sceneid" AS id, 1 - ("embeddingZh" <=> ${toVectorLiteral(vec)}::vector) AS similarity
      FROM "micro_scenes"
      WHERE "embeddingZh" IS NOT NULL
      ORDER BY "embeddingZh" <=> ${toVectorLiteral(vec)}::vector
      LIMIT ${Math.min(100, Math.max(1, limit))}
    `;
  },

  /** 灌数水位（M2 验收 & 灰度 FLAG 前检查：近零则向量路不生效） */
  async coverage(): Promise<{ clips: number; scenes: number }> {
    const [c, s] = await Promise.all([
      prisma.$queryRaw<
        Array<{ n: bigint }>
      >`SELECT COUNT(*)::bigint AS n FROM "corpus_clips" WHERE "embedding" IS NOT NULL`,
      prisma.$queryRaw<
        Array<{ n: bigint }>
      >`SELECT COUNT(*)::bigint AS n FROM "micro_scenes" WHERE "embeddingZh" IS NOT NULL`,
    ]);
    return { clips: Number(c[0]?.n ?? 0), scenes: Number(s[0]?.n ?? 0) };
  },
};
