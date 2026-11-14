// Disposable LOCAL database only. Never reads .env or migrates the application database.
// DAILY_TEST_DATABASE_URL=postgresql://...@127.0.0.1:PORT/daily_challenge_test node scripts/test-daily-challenge-postgres.mjs
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";
const url = process.env.DAILY_TEST_DATABASE_URL;
if (!url)
  throw new Error(
    "Set DAILY_TEST_DATABASE_URL to a fresh disposable local database",
  );
const address = new URL(url);
if (
  !["localhost", "127.0.0.1"].includes(address.hostname) ||
  address.pathname !== "/daily_challenge_test"
)
  throw new Error("Only local /daily_challenge_test is allowed");
process.env.DATABASE_URL = url;
const ROOT = new URL("../", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    const s = specifier.startsWith("@/")
      ? ROOT + specifier.slice(2)
      : specifier;
    if (
      (s.startsWith(".") || s.startsWith("file:")) &&
      !/\.(ts|js|mjs|json)$/.test(s)
    ) {
      try {
        return nextResolve(s + ".ts", context);
      } catch {
        /* default */
      }
    }
    return nextResolve(s, context);
  },
});
const { default: prisma } = await import("../lib/prisma.ts");
const { sampleWindow, latestPractice, buildDailyChallengeDeps } = await import(
  "../core/clips/daily-challenge.repo.ts"
);
const { getDailyAssignment } = await import(
  "../core/clips/daily-challenge.service.ts"
);
const { sentenceKey } = await import("../core/clips/daily-challenge.core.ts");
const psql = (sql) =>
  execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1"], {
    input: sql,
    encoding: "utf8",
    windowsHide: true,
  });
try {
  // No DROP/IF NOT EXISTS: this deliberately fails if the database was not empty.
  psql(`
    CREATE TABLE "User" (userid TEXT PRIMARY KEY);
    CREATE TABLE episode (episodeid TEXT PRIMARY KEY, status TEXT, "isExclusive" BOOLEAN, "audioUrl" TEXT, "audioFileName" TEXT);
    CREATE TABLE corpus_clips (
      clipid TEXT PRIMARY KEY, episodeid TEXT NOT NULL, "subtitleId" INT NOT NULL,
      "enText" TEXT NOT NULL, "zhText" TEXT, "wordsJson" JSONB, "startTime" FLOAT8,
      "endTime" FLOAT8, duration FLOAT8, wpm INT, "cefrLevel" TEXT, "topicTags" TEXT[],
      "worthyScore" FLOAT8, "sourceLabel" TEXT, "coverUrl" TEXT,
      UNIQUE(episodeid, "subtitleId")
    );
    CREATE TABLE speech_recognition (recognitionid SERIAL PRIMARY KEY, userid TEXT, episodeid TEXT,
      "subtitleId" INT, "recognitionDate" TIMESTAMPTZ, "overallScore" FLOAT8, scenario TEXT);
    CREATE TABLE vocabulary (vocabularyid SERIAL PRIMARY KEY, userid TEXT, word TEXT);
    INSERT INTO "User" VALUES ('test-user');
    INSERT INTO episode SELECT 'episode-' || i, 'published', i % 10 = 0, 'https://example.test/audio.mp3', NULL FROM generate_series(0, 999) i;
    INSERT INTO corpus_clips
    SELECT 'clip-' || i, 'episode-' || (i % 1000), i,
      'I would like to discuss project number ' || i || ' with you today', '我想和你讨论项目',
      '[{"word":"project","start":0,"end":1}]'::jsonb,
      0, 6, 6, 120, 'B1', ARRAY['topic-' || (i % 7)], 0.8, 'Test', NULL
    FROM generate_series(1, 120000) i;
  `);
  execFileSync(
    "psql",
    [
      url,
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      fileURLToPath(
        new URL(
          "../prisma/migrations/20261114150000_daily_challenge_assignment/migration.sql",
          import.meta.url,
        ),
      ),
    ],
    { encoding: "utf8", windowsHide: true },
  );
  psql("ANALYZE corpus_clips; ANALYZE episode;");
  const a = await sampleWindow("ffffffffffffffffffffffffffffffff");
  assert.equal(a.length, 128);
  assert.deepEqual(
    a,
    await sampleWindow("00000000000000000000000000000000"),
    "Ring wrap must visit the start without duplicate rows",
  );
  assert.equal(new Set(a.map(sentenceKey)).size, 128);
  assert(new Set(a.map((c) => c.episodeid)).size > 50);
  const deps = buildDailyChallengeDeps("test-secret");
  const nonPremium = await deps.sample(
    "88888888888888888888888888888888",
    null,
    false,
  );
  assert(nonPremium.length > 0 && nonPremium.every((c) => !c.isExclusive));
  const first = nonPremium[0];
  await prisma.$executeRaw`INSERT INTO speech_recognition(userid, episodeid, "subtitleId", "recognitionDate", "overallScore", scenario)
    VALUES ('test-user', ${first.episodeid}, ${first.subtitleId}, '2026-11-13T04:00:00Z'::timestamptz, 0, 'review')`;
  assert.equal((await latestPractice("test-user", [first]))[0].overallScore, 0);
  const input = { localHistory: [], levels: [] },
    now = new Date("2026-11-14T04:00:00Z");
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      getDailyAssignment(
        input,
        { userid: "test-user", premium: false },
        deps,
        now,
      ),
    ),
  );
  assert.equal(new Set(results.map((r) => r.id)).size, 1);
  assert(
    results.every(
      (r) =>
        r.status === "complete" &&
        JSON.stringify(r.items) === JSON.stringify(results[0].items),
    ),
  );
  const previous = results[0].items;
  const tomorrow = await getDailyAssignment(
    input,
    { userid: "test-user", premium: false },
    deps,
    new Date("2026-11-15T04:00:00Z"),
  );
  assert.equal(
    tomorrow.items.some((i) =>
      previous.some((p) => sentenceKey(p) === sentenceKey(i)),
    ),
    false,
  );
  assert.equal((await deps.history("test-user", "2026-11-15")).length, 5);
  const restored = await getDailyAssignment(
    { ...input, levels: ["C2"] },
    { userid: "test-user", premium: false },
    deps,
    now,
  );
  assert.deepEqual(restored, results[0]);
  const plan = await prisma.$queryRaw`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT clipid, episodeid, "subtitleId" FROM corpus_clips
    WHERE duration BETWEEN 4 AND 10 AND "wordsJson" IS NOT NULL AND "zhText" IS NOT NULL
      AND ("worthyScore" >= 0.4 OR "worthyScore" IS NULL)
      AND md5(episodeid || ':' || "subtitleId"::text) COLLATE "C" >= ${"88888888888888888888888888888888"}::text COLLATE "C"
    ORDER BY md5(episodeid || ':' || "subtitleId"::text) COLLATE "C", clipid LIMIT 128`;
  const detail = plan[0]["QUERY PLAN"][0];
  assert(JSON.stringify(detail).includes("corpus_clips_daily_sample_idx"));
  assert(!JSON.stringify(detail).includes('"Node Type":"Sort"'));
  console.log(
    JSON.stringify({
      passed: true,
      fixtureRows: 120000,
      concurrentAssignments: results.length,
      indexPlan: detail.Plan,
      executionMs: detail["Execution Time"],
    }),
  );
} finally {
  await prisma.$disconnect();
}
