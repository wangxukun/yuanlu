-- [weapp-backend] relay_segment 补 duration 列（USER=录音时长 / PERSONA=切片时长），
-- 合集 totalDuration 求和与前端棒次展示需要；首迁移漏列补齐。
ALTER TABLE "relay_segment" ADD COLUMN "duration" DOUBLE PRECISION;
