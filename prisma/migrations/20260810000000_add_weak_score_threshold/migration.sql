-- AddColumn: user_profile.weakScoreThreshold
-- 发音弱项本分数线（默认 80），低于该分的句子/音素计入弱项本
ALTER TABLE "user_profile" ADD COLUMN "weakScoreThreshold" INTEGER NOT NULL DEFAULT 80;
