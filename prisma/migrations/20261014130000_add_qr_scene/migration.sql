-- 小程序码短码映射（公众号联动 T1）：scene 短码 → 落地目标
-- getwxacodeunlimit 的 scene 上限 32 字符放不下剧集 cuid，码内只放短码、本表存完整目标
CREATE TABLE "qr_scene" (
    "scene" VARCHAR(32) NOT NULL,
    "targetType" VARCHAR(20) NOT NULL,
    "episodeId" VARCHAR(64),
    "articleNo" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_scene_pkey" PRIMARY KEY ("scene")
);
