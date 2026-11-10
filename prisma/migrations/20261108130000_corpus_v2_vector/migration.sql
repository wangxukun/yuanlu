-- [M1/T1.1] 语料工厂 v2 additive（第二部分·向量）——**挂起待部署**
-- 前置条件：Aliyun RDS 控制台为本实例启用 pgvector 插件
--   （实例详情 → 插件管理 → 添加 vector；或将数据库账号升级为高权限账号后
--    直接 CREATE EXTENSION）。启用后把本目录整体移入 prisma/migrations/
--   执行 npx prisma migrate deploy。
-- 扩展实况（2026-11-08 核查）：vector 0.8.1 pg_available_extensions 在列、
-- 未安装；当前 postgres 账号 rolsuper=false 无权 CREATE EXTENSION。

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "corpus_clips" ADD COLUMN "embedding" vector(1024);
-- en_text 路 HNSW 余弦索引（列全空时建索引瞬时完成；M2 灌数后生效）
CREATE INDEX "corpus_clips_embedding_hnsw" ON "corpus_clips"
  USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "micro_scenes" ADD COLUMN "embeddingZh" vector(1024);
CREATE INDEX "micro_scenes_embeddingZh_hnsw" ON "micro_scenes"
  USING hnsw ("embeddingZh" vector_cosine_ops);
