-- [存储优化] speech_recognition 增加 detailJson：评测明细改存 DB（JSONB），
-- 新记录不再上传 OSS 的 detail JSON 文件（detailUrl 仅存量行保留）。
--
-- 写入密集表锁表风险评估：
-- 可空列的 ADD COLUMN 在 PostgreSQL 11+ 为纯元数据变更，不重写存量行，
-- ACCESS EXCLUSIVE 锁持有时间为毫秒级，不阻塞并发评测写入。
ALTER TABLE "speech_recognition" ADD COLUMN "detailJson" JSONB;
