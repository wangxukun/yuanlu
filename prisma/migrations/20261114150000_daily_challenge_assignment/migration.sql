-- Additive only; RDS: hand-written migration + prisma migrate deploy, no shadow DB.
CREATE TABLE "daily_challenge_assignment" (
  "id" VARCHAR(64) NOT NULL,
  "userid" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "algorithmVersion" VARCHAR(32) NOT NULL,
  "seedDigest" VARCHAR(64) NOT NULL,
  "status" VARCHAR(16) NOT NULL,
  "fallbackStage" VARCHAR(32) NOT NULL,
  "items" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "daily_challenge_assignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "daily_challenge_assignment_items_check" CHECK (
    jsonb_typeof("items") = 'array' AND jsonb_array_length("items") <= 5
  ),
  CONSTRAINT "daily_challenge_assignment_status_check" CHECK ("status" IN ('complete', 'partial', 'empty'))
);
CREATE UNIQUE INDEX "daily_challenge_assignment_userid_date_key"
  ON "daily_challenge_assignment"("userid", "date");
CREATE INDEX "daily_challenge_assignment_createdAt_idx"
  ON "daily_challenge_assignment"("createdAt");
ALTER TABLE "daily_challenge_assignment" ADD CONSTRAINT "daily_challenge_assignment_userid_fkey"
  FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Prisma 6 cannot express these partial/expression indexes; preserve this SQL in future migrations.
-- Stable literals in the query deliberately match the partial index predicate.
CREATE INDEX "corpus_clips_daily_sample_idx"
ON "corpus_clips" (
  (md5("episodeid" || ':' || "subtitleId"::text) COLLATE "C"), "clipid"
)
WHERE "duration" BETWEEN 4 AND 10
  AND "wordsJson" IS NOT NULL AND "zhText" IS NOT NULL
  AND ("worthyScore" >= 0.4 OR "worthyScore" IS NULL);

CREATE INDEX "speech_recognition_daily_lookup_idx"
ON "speech_recognition" ("userid", "episodeid", "subtitleId", "recognitionDate" DESC)
WHERE "episodeid" IS NOT NULL AND "subtitleId" IS NOT NULL
  AND "recognitionDate" IS NOT NULL AND "overallScore" IS NOT NULL;
