// No DB/network: policy, replay and service concurrency tests.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { setImmediate } from "node:timers";
const ROOT = new URL("../", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    let s = specifier.startsWith("@/") ? ROOT + specifier.slice(2) : specifier;
    if (
      (s.startsWith(".") || s.startsWith("file:")) &&
      !/\.(ts|js|mjs|json)$/.test(s)
    ) {
      try {
        return nextResolve(s + ".ts", context);
      } catch {
        /* default resolution */
      }
    }
    return nextResolve(s, context);
  },
});
const c = await import("../core/clips/daily-challenge.core.ts");
const { getDailyAssignment } = await import(
  "../core/clips/daily-challenge.service.ts"
);
const date = "2026-11-14";
function clip(i, overrides = {}) {
  const text = `I would like to discuss project number ${i} with you today`;
  return {
    clipid: `clip-${i}`,
    episodeid: `episode-${i % 50}`,
    subtitleId: i,
    enText: text,
    zhText: "我想和你讨论这个项目",
    wordsJson: text
      .split(" ")
      .map((word, j) => ({ word, start: j * 0.5, end: j * 0.5 + 0.4 })),
    startTime: 0,
    endTime: 6,
    duration: 6,
    wpm: 120,
    cefrLevel: "B1",
    topicTags: [`topic-${i % 7}`],
    worthyScore: 0.8,
    sourceLabel: "Test",
    coverUrl: null,
    ...overrides,
  };
}
const pool = Array.from({ length: 600 }, (_, i) => clip(i));
const context = { date, seed: "test", history: [], vocabulary: [], levels: [] };
const picked = c.selectDaily(pool, context);
assert.equal(picked.status, "complete");
assert.equal(new Set(picked.items.map((i) => i.episodeid)).size, 5);
assert.deepEqual(
  c.selectDaily([...pool].reverse(), context),
  picked,
  "Input order must not determine ranking",
);
assert.equal(c.chinaDate(new Date("2026-11-13T16:00:00Z")), date);
assert.equal(c.chinaDate(new Date("2026-11-13T15:59:59Z")), "2026-11-13");
assert.notEqual(
  c.dailySeed("secret", "u1", date),
  c.dailySeed("secret", "u2", date),
);
assert.notEqual(
  c.dailySeed("secret", "u1", date),
  c.dailySeed("secret", "u1", "2026-11-15"),
);
assert.equal(
  c.parseDailyInput(
    { localHistory: [{ episodeid: "e", subtitleId: 0, servedOn: date }] },
    date,
  ).localHistory.length,
  1,
);
assert.equal(
  c.parseDailyInput(
    {
      localHistory: [{ episodeid: "e", subtitleId: 0, servedOn: "2026-02-30" }],
    },
    date,
  ).localHistory.length,
  0,
);
assert.throws(() => c.parseDailyInput({ userid: "someone-else" }, date));
assert.throws(() =>
  c.parseDailyInput({ localHistory: Array(501).fill({}) }, date),
);
assert.throws(() => c.parseDailyInput({ levels: ["anything"] }, date));
assert.equal(
  c.isDailyClipUsable(clip(1, { wordsJson: [{ word: "test" }] })),
  false,
);
assert.equal(c.isDailyClipUsable(clip(1, { wordsJson: [] })), false);
assert.equal(c.isDailyClipUsable(clip(1, { zhText: " " })), false);

const served = picked.items.map((i) => ({
  ...i,
  servedOn: c.daysBefore(date, 30),
}));
assert.equal(
  c
    .selectDaily(pool, { ...context, history: served })
    .items.some((i) =>
      served.some((h) => c.sentenceKey(h) === c.sentenceKey(i)),
    ),
  false,
);
assert.equal(
  c.selectDaily(pool.slice(0, 1), {
    ...context,
    history: [{ ...pool[0], servedOn: c.daysBefore(date, 7) }],
  }).status,
  "empty",
  "Seven day floor must not be relaxed",
);
assert.equal(
  c.selectDaily(pool.slice(0, 1), {
    ...context,
    history: [{ ...pool[0], practicedOn: c.daysBefore(date, 30) }],
  }).status,
  "empty",
);
const oldPractice = c.selectDaily(
  [clip(1, { lastPracticedOn: c.daysBefore(date, 40) })],
  context,
);
assert.equal(oldPractice.items[0].selectionReason, "cooldown_reuse");
const vocabPool = pool.map((p, i) =>
  i < 200
    ? p
    : { ...p, wordsJson: p.wordsJson.filter((w) => w.word !== "project") },
);
const personalized = c.selectDaily(vocabPool, {
  ...context,
  vocabulary: ["project"],
});
assert.equal(personalized.items.filter((i) => i.matchedWords.length).length, 2);
const practicedVocab = c.selectDaily(
  vocabPool.map((p, i) =>
    i < 200 ? { ...p, lastPracticedOn: c.daysBefore(date, 100) } : p,
  ),
  { ...context, vocabulary: ["project"] },
);
assert.equal(
  practicedVocab.items.some((i) => i.selectionReason === "vocabulary"),
  false,
);
const duplicateText = c.selectDaily(
  [clip(1), clip(2, { enText: pool[1].enText })],
  context,
);
assert.equal(duplicateText.items.length, 1);
assert.equal(
  c.selectDaily(pool, { ...context, levels: ["C2"] }).status,
  "empty",
  "Explicit level is never relaxed",
);
assert.equal(
  c.selectDaily(
    pool.map((p) => ({ ...p, cefrLevel: "C2" })),
    context,
  ).fallbackStage,
  "diversity_relaxed",
);

// Simulate actual progression: each day's practice is added only AFTER allocation.
let emitted = 0,
  repeat30 = 0,
  practiced90 = 0,
  fallbacks = 0;
for (const user of ["new", "never_practices", "heavy", "vocabulary"]) {
  let history = [];
  const lastPractice = new Map();
  for (let day = 0; day < 120; day++) {
    const today = c.daysBefore(date, 119 - day);
    const result = c.selectDaily(
      pool.map((p) => ({
        ...p,
        lastPracticedOn: lastPractice.get(c.sentenceKey(p)),
      })),
      {
        date: today,
        seed: c.dailySeed("test", user, today),
        history,
        vocabulary: user === "vocabulary" ? ["project"] : [],
        levels: [],
      },
    );
    assert.equal(result.items.length, 5);
    for (const i of result.items) {
      const key = c.sentenceKey(i);
      repeat30 += Number(
        history.some(
          (h) =>
            c.sentenceKey(h) === key && h.servedOn >= c.daysBefore(today, 30),
        ),
      );
      practiced90 += Number(
        (lastPractice.get(key) || "") >= c.daysBefore(today, 90),
      );
      history.push({ ...i, servedOn: today });
      if (user !== "never_practices") lastPractice.set(key, today);
    }
    history = history.filter((h) => h.servedOn >= c.daysBefore(today, 90));
    emitted += result.items.length;
    fallbacks += Number(result.fallbackStage !== "normal");
  }
}
assert.equal(repeat30, 0);
assert.equal(practiced90, 0);

let sampleCalls = 0,
  saved = null;
const deps = {
  secret: "secret",
  findAssignment: async () => saved,
  history: async () => [],
  vocabulary: async () => [],
  sample: async () => {
    sampleCalls++;
    await new Promise((r) => setImmediate(r));
    return pool.slice(0, 128);
  },
  saveAssignment: async (_userid, value) => {
    saved ||= { ...value, id: "winner" };
    return saved;
  },
};
const input = { localHistory: [], levels: [] },
  user = { userid: "u1", premium: false };
const now = new Date("2026-11-14T04:00:00Z");
const results = await Promise.all(
  Array.from({ length: 8 }, () => getDailyAssignment(input, user, deps, now)),
);
assert(
  results.every(
    (r) =>
      r.id === "winner" &&
      JSON.stringify(r.items) === JSON.stringify(saved.items),
  ),
);
const beforeCalls = sampleCalls;
await getDailyAssignment({ ...input, levels: ["C2"] }, user, deps, now);
assert.equal(
  sampleCalls,
  beforeCalls,
  "Today restoration bypasses selection even when preferences change",
);
saved = null;
sampleCalls = 0;
deps.sample = async () => {
  sampleCalls++;
  return [];
};
assert.equal(
  (await getDailyAssignment(input, user, deps, now)).status,
  "empty",
);
assert.equal(sampleCalls, 12, "Pool shortage must respect scan budget");
await getDailyAssignment(input, user, deps, now);
assert.equal(sampleCalls, 12, "Empty assignment is stable too");
assert.equal(
  (
    await getDailyAssignment(
      { ...input, anonymousId: "guest_test_1234567" },
      null,
      deps,
      now,
    )
  ).id,
  null,
);
console.log(
  JSON.stringify({
    passed: true,
    simulatedUserDays: 480,
    emitted,
    repeat30,
    practiced90,
    fallbacks,
    concurrentRequests: results.length,
  }),
);
