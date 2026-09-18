-- [P3-i②] AI 剧集深度精讲缓存表（每集一次生成，PRO 共享）
CREATE TABLE "episode_deep_dives" (
    "id" SERIAL NOT NULL,
    "episodeid" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episode_deep_dives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "episode_deep_dives_episodeid_key" ON "episode_deep_dives"("episodeid");

-- AddForeignKey
ALTER TABLE "episode_deep_dives" ADD CONSTRAINT "episode_deep_dives_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;
