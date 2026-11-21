import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const root = new URL("../", import.meta.url);
const days = [
  ["alice", "2026-11-22", 120],
  ["alice", "2026-11-23", 1799],
  ["alice", "2026-11-24", 1],
  ["bob", "2026-11-24", 90],
];
const words = [
  ["alice", "2026-11-22T15:59:59.999Z"],
  ["alice", "2026-11-22T16:00:00.000Z"],
  ["alice", "2026-11-29T15:59:59.999Z"],
  ["alice", "2026-11-29T16:00:00.000Z"],
  ["bob", "2026-11-22T16:00:00.000Z"],
];
const inRange = (value, { gte, lt }) =>
  new Date(value) >= gte && new Date(value) < lt;
globalThis.goalDb = {
  user_daily_activity: {
    findMany: ({ where }) =>
      days
        .filter(
          ([user, day]) => user === where.userid && inRange(day, where.date),
        )
        .map(([, day, listeningSeconds]) => ({
          date: new Date(day),
          listeningSeconds,
        })),
  },
  vocabulary: {
    count: ({ where }) =>
      words.filter(
        ([user, date]) =>
          user === where.userid && inRange(date, where.addedDate),
      ).length,
  },
};
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === "@/lib/prisma")
      return { url: "test:prisma", shortCircuit: true };
    if (spec.startsWith("@/")) spec = new URL(spec.slice(2) + ".ts", root).href;
    return next(spec, ctx);
  },
  load(url, ctx, next) {
    if (url === "test:prisma")
      return {
        format: "module",
        source: "export default globalThis.goalDb",
        shortCircuit: true,
      };
    return next(url, ctx);
  },
});
const { getGoalProgress } = await import("../core/stats/weekly-activity.ts");
const day = new Date("2026-11-24T01:00:00Z");
assert.deepEqual(await getGoalProgress("alice", day), {
  todaySeconds: 1,
  weeklySeconds: 1800,
  weeklyWords: 2,
});
assert.deepEqual(await getGoalProgress("bob", day), {
  todaySeconds: 90,
  weeklySeconds: 90,
  weeklyWords: 1,
});
assert.deepEqual(await getGoalProgress("new", day), {
  todaySeconds: 0,
  weeklySeconds: 0,
  weeklyWords: 0,
});
assert.deepEqual(
  await getGoalProgress("alice", new Date("2026-11-22T15:59:59Z")),
  { todaySeconds: 120, weeklySeconds: 120, weeklyWords: 1 },
);
console.log("每周目标进度：北京时间周界、用户隔离、每日与每周秒数、零记录通过");
