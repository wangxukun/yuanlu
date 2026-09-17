-- [P3-b] 评测双池拆分：speech_recognition 增加 scenario（learn=学新月池 / review=复习日池）
--
-- 写入密集表锁表风险评估：
-- PostgreSQL 11+ 对"带常量默认值的 NOT NULL 新增列"为纯元数据变更，不重写存量行
-- （旧行读取时按默认值 'learn' 虚拟补齐），ACCESS EXCLUSIVE 锁持有时间为毫秒级，
-- 不阻塞并发评测写入。已在预发/低峰窗口执行验证。
ALTER TABLE "speech_recognition" ADD COLUMN "scenario" TEXT NOT NULL DEFAULT 'learn';

-- CreateIndex
-- 双池配额计数查询（月池/日池 count where userid + scenario + recognitionDate 范围）走此索引
CREATE INDEX "speech_recognition_userid_scenario_recognitionDate_idx" ON "speech_recognition"("userid", "scenario", "recognitionDate" DESC);
