-- [RESHAPE T1.1] 语料原子化：句级切片索引 + 微剧场 + 卡册条目扩展（纯 additive，
-- 不触碰任何既有表结构，网页版零感知）
CREATE TABLE "corpus_clips" (
    "clipid" VARCHAR(64) NOT NULL,
    "episodeid" VARCHAR(255) NOT NULL,
    "subtitleId" INTEGER NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "enText" TEXT NOT NULL,
    "zhText" TEXT,
    "speaker" VARCHAR(255),
    "wordsJson" JSONB,
    "wpm" INTEGER NOT NULL DEFAULT 0,
    "acousticFlags" JSONB,
    "phonemeTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topicTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cefrLevel" VARCHAR(20),
    "coverUrl" VARCHAR(500),
    "sourceLabel" VARCHAR(255),
    "clipAudioKey" VARCHAR(255),
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "corpus_clips_pkey" PRIMARY KEY ("clipid")
);

-- 幂等重建口径：同集同字幕句唯一（build-corpus-index 按此 upsert 对账）
CREATE UNIQUE INDEX "corpus_clips_episodeid_subtitleId_key" ON "corpus_clips"("episodeid", "subtitleId");
CREATE INDEX "corpus_clips_episodeid_idx" ON "corpus_clips"("episodeid");
CREATE INDEX "corpus_clips_cefrLevel_wpm_idx" ON "corpus_clips"("cefrLevel", "wpm");

CREATE TABLE "micro_scenes" (
    "sceneid" VARCHAR(64) NOT NULL,
    "episodeid" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "summaryZh" TEXT,
    "situationTag" VARCHAR(50),
    "cefrLevel" VARCHAR(20),
    "coverUrl" VARCHAR(500),
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "clipsJson" JSONB,
    "deepDiveJson" JSONB,
    "clipAudioKey" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "micro_scenes_pkey" PRIMARY KEY ("sceneid")
);

CREATE INDEX "micro_scenes_episodeid_idx" ON "micro_scenes"("episodeid");
CREATE INDEX "micro_scenes_situationTag_idx" ON "micro_scenes"("situationTag");

-- 卡册条目可空扩展：心愿定制卡册条目指向切片/微剧场；存量行保持 NULL，
-- episodeid 语义不变（Web 路径详情按剧集渲染不受影响）
ALTER TABLE "learning_path_items" ADD COLUMN "clipId" VARCHAR(64);
ALTER TABLE "learning_path_items" ADD COLUMN "sceneId" VARCHAR(64);
