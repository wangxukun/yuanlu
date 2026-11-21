import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const root = new URL("../", import.meta.url);
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === "@/lib/prisma")
      return { url: "mock:prisma", shortCircuit: true };
    if (spec.startsWith("@/")) spec = new URL(spec.slice(2) + ".ts", root).href;
    return next(spec, ctx);
  },
  load(url, ctx, next) {
    if (url === "mock:prisma")
      return {
        format: "module",
        source: "export default globalThis.streakDb",
        shortCircuit: true,
      };
    return next(url, ctx);
  },
});

const { chinaToday, subUTCDays } = await import("../core/utils/china-date.ts");
const today = chinaToday();
const yesterday = subUTCDays(today, 1);
const rows = [{ userid: "learner", date: yesterday }];
let target = 10;
let seconds = 599;
let rec = { userid: "learner", recognitionDate: today };
const assertToday = ({ where: { userid_date } }) => {
  assert.equal(userid_date.userid, "learner");
  assert.deepEqual(userid_date.date, today);
};
globalThis.streakDb = {
  user_profile: {
    findUnique: async ({ where }) => {
      assert.equal(where.userid, "learner");
      return target == null ? null : { dailyStudyGoalMins: target };
    },
  },
  user_daily_activity: {
    findUnique: async (query) => {
      assertToday(query);
      return seconds == null ? null : { listeningSeconds: seconds };
    },
  },
  speech_recognition: { findUnique: async () => rec },
  weapp_streak_log: {
    findMany: async () => rows,
    findUnique: async (query) => {
      assertToday(query);
      return rows.find((row) => +row.date === +today);
    },
    createMany: async ({ data, skipDuplicates }) => {
      assert.equal(skipDuplicates, true);
      if (rows.some((row) => +row.date === +today)) return { count: 0 };
      rows.push(...data);
      return { count: 1 };
    },
  },
};
const { getStreakStatus, igniteStreak } = await import(
  "../core/streak/weapp-streak.service.ts"
);
const status = () => getStreakStatus("learner");
const ignite = (recognitionId) => igniteStreak("learner", recognitionId);
assert.deepEqual((await status()).dailyGoal, {
  minutes: 10,
  listenedSeconds: 599,
  remainingMinutes: 1,
});
assert.equal((await ignite()).code, "DAILY_GOAL_PENDING");
assert.equal((await ignite(123)).code, "DAILY_GOAL_PENDING");
assert.equal(rows.length, 1);
seconds++;
rec = { userid: "another", recognitionDate: today };
assert.equal((await ignite(123)).code, "INVALID_RECOGNITION");
rec = { userid: "learner", recognitionDate: yesterday };
assert.equal((await ignite(123)).code, "STALE_RECOGNITION");
rec.recognitionDate = today;
const concurrent = await Promise.all([ignite(123), ignite()]);
assert.deepEqual(concurrent.map((r) => r.data.justIgnited).sort(), [
  false,
  true,
]);
assert.equal(rows.length, 2);
assert.equal((await status()).streakDays, 2);
target = 30;
assert.equal((await ignite()).data.justIgnited, false);
assert.equal((await status()).ignitedToday, true);
rows.pop();
seconds = 1800;
assert.equal((await ignite(123)).data.justIgnited, true);
assert.equal(rows.at(-1).source, "SPEECH");
rows.pop();
assert.equal((await ignite()).data.justIgnited, true);
assert.equal(rows.at(-1).source, "MANUAL");
target = null;
seconds = null;
assert.deepEqual((await status()).dailyGoal, {
  minutes: 20,
  listenedSeconds: 0,
  remainingMinutes: 20,
});
console.log("每日目标、按日读数、双通道达标边界、重复点亮与连胜回归通过");
