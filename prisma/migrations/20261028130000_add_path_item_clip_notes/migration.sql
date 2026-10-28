-- [RESHAPE T3.2] 心愿卡册条目的策展批注（纯 additive；存量行为 NULL，
-- 网页版与旧小程序读不到即忽略）
ALTER TABLE "learning_path_items" ADD COLUMN "clipNote" TEXT;
ALTER TABLE "learning_path_items" ADD COLUMN "clipQuestion" TEXT;
