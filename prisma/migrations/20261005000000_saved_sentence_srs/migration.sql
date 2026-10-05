-- [SRS] 句子本遗忘曲线调度字段（对齐 vocabulary 表同名字段口径：
-- Leitner 熟练度 + 下次复习到期时间；存量行回填 now() → 上线日全部待复习，
-- 与生词本历史行为一致）

-- AlterTable
ALTER TABLE "SavedSentence" ADD COLUMN     "proficiency" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextReviewAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
