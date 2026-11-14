-- [weapp-backend] 跟读接力 + 点赞三表（yl-weapp home 接力/排行榜真实化）
-- 纯 additive；RDS 用户无建库权限（P3014），故手写迁移 + migrate deploy。
-- 语义：发起 = 用户第 1 棒 + 语伴第 2 棒（corpus 切片扮演），RECRUITING 等接棒；
-- 接棒 = 第 3 棒压轴 → 生成合集（compilation Jsonb）→ COMPLETED。

-- ① 接力房间
CREATE TABLE "relay_room" (
    "roomid" VARCHAR(64) NOT NULL,
    "title" VARCHAR(60) NOT NULL,
    "topic" VARCHAR(60),
    "difficulty" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'RECRUITING',
    "initiatorUserid" TEXT NOT NULL,
    "starterClipId" VARCHAR(64) NOT NULL,
    "promptClipId" VARCHAR(64) NOT NULL,
    "compilation" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "relay_room_pkey" PRIMARY KEY ("roomid")
);
CREATE INDEX "relay_room_status_updatedAt_idx"
  ON "relay_room"("status", "updatedAt" DESC);
ALTER TABLE "relay_room" ADD CONSTRAINT "relay_room_initiatorUserid_fkey"
  FOREIGN KEY ("initiatorUserid") REFERENCES "User"("userid")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- ② 棒次：USER=真录音（audioKey→OSS + 关联评测分）/ PERSONA=语伴切片扮演
CREATE TABLE "relay_segment" (
    "segid" VARCHAR(64) NOT NULL,
    "roomid" VARCHAR(64) NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "kind" VARCHAR(10) NOT NULL,
    "userid" TEXT,
    "personaKey" VARCHAR(20),
    "clipid" VARCHAR(64) NOT NULL,
    "audioKey" VARCHAR(255),
    "score" DOUBLE PRECISION,
    "recognitionid" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "relay_segment_pkey" PRIMARY KEY ("segid")
);
CREATE UNIQUE INDEX "relay_segment_roomid_stepOrder_key"
  ON "relay_segment"("roomid", "stepOrder");
ALTER TABLE "relay_segment" ADD CONSTRAINT "relay_segment_roomid_fkey"
  FOREIGN KEY ("roomid") REFERENCES "relay_room"("roomid") ON DELETE CASCADE;
ALTER TABLE "relay_segment" ADD CONSTRAINT "relay_segment_userid_fkey"
  FOREIGN KEY ("userid") REFERENCES "User"("userid")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- ③ 点赞（读时 count；日榜行 LB_ENTRY=被赞 userid / 接力房 RELAY_ROOM=roomid）
CREATE TABLE "social_likes" (
    "id" SERIAL NOT NULL,
    "likerUserid" TEXT NOT NULL,
    "targetType" VARCHAR(20) NOT NULL,
    "targetId" VARCHAR(64) NOT NULL,
    "likeDate" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "social_likes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "social_likes_likerUserid_targetType_targetId_likeDate_key"
  ON "social_likes"("likerUserid", "targetType", "targetId", "likeDate");
CREATE INDEX "social_likes_targetType_targetId_likeDate_idx"
  ON "social_likes"("targetType", "targetId", "likeDate");
ALTER TABLE "social_likes" ADD CONSTRAINT "social_likes_likerUserid_fkey"
  FOREIGN KEY ("likerUserid") REFERENCES "User"("userid")
  ON DELETE CASCADE ON UPDATE NO ACTION;
