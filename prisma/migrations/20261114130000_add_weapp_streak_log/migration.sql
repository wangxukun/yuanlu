-- [weapp-backend] 小程序「每日学习连胜」打卡表：与网站版 user_daily_activity
-- （收听口径）完全隔离。纯 additive；RDS 用户无建库权限（P3014），
-- 手写迁移 + migrate deploy（同 20261114120000 惯例）。
-- 防刷天 = @@unique(userid, date)（中国日界）；streakDays 读时连算。
CREATE TABLE "weapp_streak_log" (
    "id" VARCHAR(64) NOT NULL,
    "userid" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "recognitionid" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "weapp_streak_log_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "weapp_streak_log_userid_date_key"
  ON "weapp_streak_log"("userid", "date");
CREATE INDEX "weapp_streak_log_userid_date_idx"
  ON "weapp_streak_log"("userid", "date" DESC);
ALTER TABLE "weapp_streak_log" ADD CONSTRAINT "weapp_streak_log_userid_fkey"
  FOREIGN KEY ("userid") REFERENCES "User"("userid")
  ON DELETE CASCADE ON UPDATE NO ACTION;
