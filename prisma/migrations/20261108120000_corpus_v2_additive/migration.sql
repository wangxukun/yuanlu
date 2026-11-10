-- [M1/T1.1] 语料工厂 v2 additive（第一部分·无向量）：对象名指纹 + qcFlags +
-- sceneKey 稳定键 + clip_vocab 倒排 + generated_scene 缓存
-- （纯 additive，旧行为读序不变：cut=null → 动态计算 → 旧对象名命中不变）
-- 向量部分（CREATE EXTENSION + vector 列 + HNSW）在第二部分
-- 20261108130000_corpus_v2_vector——需 Aliyun 控制台启用 pgvector 插件后部署。

-- ① corpus_clips 加列（全部可空/带默认）
ALTER TABLE "corpus_clips" ADD COLUMN "cutStart" DOUBLE PRECISION;
ALTER TABLE "corpus_clips" ADD COLUMN "cutEnd" DOUBLE PRECISION;
ALTER TABLE "corpus_clips" ADD COLUMN "padBeforeMs" INTEGER;
ALTER TABLE "corpus_clips" ADD COLUMN "padAfterMs" INTEGER;
ALTER TABLE "corpus_clips" ADD COLUMN "qcFlags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "corpus_clips" ADD COLUMN "contentHash" VARCHAR(40);
ALTER TABLE "corpus_clips" ADD COLUMN "pipelineVersion" VARCHAR(20);
ALTER TABLE "corpus_clips" ADD COLUMN "worthyScore" DOUBLE PRECISION;
ALTER TABLE "corpus_clips" ADD COLUMN "modelId" VARCHAR(40);
ALTER TABLE "corpus_clips" ADD COLUMN "highlights" JSONB;
ALTER TABLE "corpus_clips" ADD COLUMN "clozeData" JSONB;

-- 指纹查询辅助（幂等对账：按 hash 找行）
CREATE INDEX "corpus_clips_contentHash_idx" ON "corpus_clips"("contentHash");
-- 值得学分档（M3 worthyScore 门禁读路径）
CREATE INDEX "corpus_clips_worthyScore_idx" ON "corpus_clips"("worthyScore");

-- ② micro_scenes：sceneKey 回填 + NOT NULL + 唯一
--    稳定键 = episodeid + ':' + 首句 subtitleId（clipsJson 首元素）；
--    防御：clipsJson 首元素缺失的行回落 sceneid（保持非空且唯一）
ALTER TABLE "micro_scenes" ADD COLUMN "sceneKey" VARCHAR(80);
UPDATE "micro_scenes"
SET "sceneKey" = "episodeid" || ':' ||
  COALESCE("clipsJson"->'clips'->0->>'subtitleId', "sceneid");
ALTER TABLE "micro_scenes" ALTER COLUMN "sceneKey" SET NOT NULL;
CREATE UNIQUE INDEX "micro_scenes_sceneKey_key" ON "micro_scenes"("sceneKey");

-- ③ clip_vocab 语义倒排（M3/T3.2 dict 例句切换的数据面）
CREATE TABLE "clip_vocab" (
    "id" VARCHAR(64) NOT NULL,
    "clipid" VARCHAR(64) NOT NULL,
    "lemma" VARCHAR(64) NOT NULL,
    "surfaceForm" VARCHAR(64) NOT NULL,
    "charStart" INTEGER NOT NULL,
    "charEnd" INTEGER NOT NULL,
    "contextZh" VARCHAR(255),
    CONSTRAINT "clip_vocab_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "clip_vocab_lemma_idx" ON "clip_vocab"("lemma");
CREATE INDEX "clip_vocab_clipid_idx" ON "clip_vocab"("clipid");
ALTER TABLE "clip_vocab" ADD CONSTRAINT "clip_vocab_clipid_fkey"
  FOREIGN KEY ("clipid") REFERENCES "corpus_clips"("clipid") ON DELETE CASCADE;

-- ④ generated_scene 用户生成微场景缓存（T3.6/T3.7 消费）
CREATE TABLE "generated_scene" (
    "id" VARCHAR(64) NOT NULL,
    "userPrompt" VARCHAR(300) NOT NULL,
    "promptHash" VARCHAR(40) NOT NULL,
    "scenarioOverview" TEXT,
    "roleplayTask" TEXT,
    "clipIds" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    "sceneId" VARCHAR(64),
    "creatorId" VARCHAR(64),
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "generated_scene_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "generated_scene_promptHash_idx" ON "generated_scene"("promptHash");
