import assert from "node:assert/strict";
import { registerHooks } from "node:module";
const root = new URL("../", import.meta.url);
const calls = [];
const record = (name, result) => async (args) => {
  calls.push({ name, args });
  return result;
};
globalThis.__studioTestDb = {
  user_profile: {
    findUnique: record("profile", {
      dailyStudyGoalMins: 30,
      learnLevel: "Beginner",
    }),
  },
  user_daily_activity: { findMany: record("activity", []) },
  speech_recognition: {
    groupBy: record("speech", [
      { userid: "user-b", _count: { recognitionid: 2 } },
      { userid: "user-a", _count: { recognitionid: 2 } },
      { userid: "user-c", _count: { recognitionid: 5 } },
    ]),
    count: record("passed", 1),
  },
  vocabulary: {
    count: async (args) => {
      calls.push({ name: "vocabulary", args });
      return args.where.OR ? 3 : args.where.status === "MASTERED" ? 2 : 8;
    },
  },
  savedSentence: { count: record("sentences", 7) },
};
registerHooks({
  resolve(spec, context, next) {
    if (spec === "@/lib/prisma")
      return { url: "test:prisma", shortCircuit: true };
    if (spec === "./stats.service")
      return { url: "test:stats", shortCircuit: true };
    if (spec.startsWith("@/")) spec = new URL(spec.slice(2) + ".ts", root).href;
    return next(spec, context);
  },
  load(url, context, next) {
    if (url === "test:prisma")
      return {
        format: "module",
        source: "export default globalThis.__studioTestDb",
        shortCircuit: true,
      };
    if (url === "test:stats")
      return {
        format: "module",
        source: "export const DEFAULT_DAILY_GOAL_MINS = 20",
        shortCircuit: true,
      };
    return next(url, context);
  },
});
const { studioDayBounds, summarizeStudyDays, getStudioDashboard } =
  await import("../core/stats/studio-dashboard.service.ts");
const now = new Date("2026-11-11T16:00:00Z");
const { day, start, end } = studioDayBounds(now);
assert.equal(day.toISOString(), "2026-11-12T00:00:00.000Z");
assert.equal(start.toISOString(), "2026-11-11T16:00:00.000Z");
assert.equal(end.toISOString(), "2026-11-12T16:00:00.000Z");
assert.equal(
  studioDayBounds(new Date(now.getTime() - 1)).day.toISOString(),
  "2026-11-11T00:00:00.000Z",
);
const activity = (date, isActive, seconds = 0) => ({
  date: new Date(date + "T00:00:00Z"),
  isActive,
  listeningSeconds: seconds,
});
const history = [
  activity("2026-11-11", true),
  activity("2026-11-10", true),
  activity("2026-11-08", true),
];
let study = summarizeStudyDays(day, history, 30);
assert.equal(
  study.streakDays,
  2,
  "yesterday preserves streak until today finishes",
);
assert.equal(study.week.filter((d) => d.lit).length, 3);
assert.equal(study.week.at(-1).label, "今日");
assert.equal(study.week.at(-1).lit, false);
study = summarizeStudyDays(
  day,
  [...history, activity("2026-11-12", false, 1800)],
  30,
);
assert.equal(
  study.streakDays,
  3,
  "current seconds are authoritative even if isActive has not caught up",
);
assert.equal(study.achieved, true);
study = summarizeStudyDays(
  day,
  [...history, activity("2026-11-12", true, 1799)],
  30,
);
assert.equal(study.achieved, false);
assert.equal(
  study.remainingMins,
  1,
  "one second left still means not achieved",
);
assert.equal(summarizeStudyDays(day, [], 20).streakDays, 0);
assert.equal(
  summarizeStudyDays(day, [activity("2026-11-10", true)], 20).streakDays,
  0,
  "gap breaks streak",
);
const result = await getStudioDashboard("user-b", now);
assert.equal(result.shadowing.count, 2);
assert.equal(
  result.shadowing.rank,
  3,
  "stable tie ordering agrees with leaderboard",
);
assert.equal(result.vocabulary.total, 8);
assert.equal(result.vocabulary.mastered, 2);
assert.equal(result.vocabulary.due, 3);
assert.equal(result.sentences.total, 7);
assert.equal(result.recommendation.level, "A2");
assert.equal(
  calls.find((c) => c.name === "passed").args.where.overallScore.gte,
  85,
);
for (const c of calls.filter((c) => c.name !== "speech"))
  assert.equal(
    c.args.where.userid,
    "user-b",
    c.name + " must be scoped to authenticated user",
  );
const speechWhere = calls.find((c) => c.name === "speech").args.where;
assert.equal(speechWhere.recognitionDate.gte.getTime(), start.getTime());
assert.equal(speechWhere.recognitionDate.lt.getTime(), end.getTime());
const dueWhere = calls.find((c) => c.name === "vocabulary" && c.args.where.OR)
  .args.where;
assert.equal(dueWhere.status.not, "MASTERED");
assert.equal(dueWhere.OR[0].nextReviewAt, null);
assert.equal(dueWhere.OR[1].nextReviewAt.lte, now);
assert.equal(
  (await getStudioDashboard("no-practice", now)).shadowing.rank,
  null,
);
console.log(
  "PASS studio dashboard: China day boundary, streak/goal semantics, user-scoped aggregation, due queue, rank and level mapping",
);
