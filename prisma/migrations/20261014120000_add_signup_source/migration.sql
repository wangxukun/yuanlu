-- 注册来源归因（公众号联动 T3）：小程序码 scene / 路径参数（如 gzh_follow、gzh_w1_b），
-- 预留网页注册 utm。仅建号时写入，可空。
ALTER TABLE "User" ADD COLUMN "signupSource" VARCHAR(100);
