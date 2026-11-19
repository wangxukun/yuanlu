// Unit tests for core/corpus/reels-feed.service.ts (cursor validation, ring page picking, legacy shuffle).
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const ROOT = new URL("../", import.meta.url).href;
const stubs = {
  "@/lib/prisma": "export default globalThis.reelsPrisma;",
  "@/lib/oss": "export const signOssHttpUrl = async (u) => u;",
  "@/core/corpus/clip-audio.service":
    "export const clipAudioService = { ensureClipAudio: async () => null };",
  "@/core/corpus/clip-audio.deps":
    "export const buildRealClipAudioDeps = () => ({});",
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (stubs[specifier]) {
      return {
        url: "data:text/javascript," + encodeURIComponent(stubs[specifier]),
        shortCircuit: true,
      };
    }
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

const queries = [];
const legacyCalls = [];
globalThis.reelsPrisma = {
  $queryRaw: async (q) => {
    queries.push(q);
    return [];
  },
  corpus_clips: {
    findMany: async (args) => {
      legacyCalls.push(args);
      return [];
    },
    count: async (args) => {
      legacyCalls.push(args);
      return 0;
    },
  },
};
const feed = await import("../core/corpus/reels-feed.service.ts");

assert.equal(feed.parseRingCursor(null), null);
assert.equal(feed.parseRingCursor(""), "");
assert.equal(feed.parseRingCursor("3FA9C01B"), "3fa9c01b");
assert.equal(
  feed.parseRingCursor("not-hex!!"),
  null,
  "Invalid cursor falls back to legacy mode",
);
assert.deepEqual(feed.parseLevels("b1, B2, invalid, C1"), ["B1", "B2", "C1"]);

const ranges = (q) => feed.parseFeedRanges(new URLSearchParams(q));
assert.deepEqual(ranges(""), {});
assert.deepEqual(ranges("maxWpm=120"), { wpm: { gte: 1, lte: 120 } });
assert.deepEqual(ranges("minWords=7"), { wordCount: { gte: 7 } });
for (const invalid of [
  "minWords=12&maxWords=11",
  "maxWpm=0",
  "minWpm=1.5",
  "maxWords=x",
  "minWords=9999999999",
]) {
  assert.equal(ranges(invalid), null);
}
const bounds = ranges("minWords=8&maxWords=15&minWpm=110&maxWpm=145");
const options = { levels: ["A2", "B1"], page: 1, pageSize: 12, ranges: bounds };
await feed.getReelsFeed({ ...options, cursor: "ab" });
assert.equal(queries.length, 2, "tail and wrapped head both queried");
for (const query of queries) {
  assert.match(query.sql, /"cefrLevel" IN \(\?,\?\)/);
  assert.match(
    query.sql,
    /AND "wordCount" >= \? AND "wordCount" <= \? AND wpm >= \? AND wpm <= \?/,
  );
  assert.deepEqual(query.values.slice(0, 6), ["A2", "B1", 8, 15, 110, 145]);
}
await feed.getReelsFeed({ ...options, cursor: null });
assert.deepEqual(legacyCalls[0].where, legacyCalls[1].where);
assert.deepEqual(legacyCalls[0].where.wordCount, bounds.wordCount);
assert.deepEqual(legacyCalls[0].where.wpm, bounds.wpm);
assert.deepEqual(legacyCalls[0].where.cefrLevel.in, options.levels);
await feed.getReelsFeed({ levels: [], page: 1, pageSize: 12, cursor: "ab" });
assert.doesNotMatch(queries[2].sql, /"wordCount" >=|wpm >=|"cefrLevel" IN/);

function makeRow(
  i,
  ep = `ep-${i}`,
  text = `We need to build a sustainable system for step ${i} today`,
) {
  return {
    clipid: `clip-${i}`,
    episodeid: ep,
    subtitleId: i,
    startTime: 0,
    endTime: 6,
    duration: 6,
    enText: text,
    zhText: "我们需要建立一个可持续的系统",
    wordsJson: text
      .split(" ")
      .map((word, j) => ({ word, start: j * 0.5, end: j * 0.5 + 0.4 })),
    wpm: 120,
    cefrLevel: "B1",
    coverUrl: null,
    sourceLabel: "Podcast",
    topicTags: ["tech"],
    ringKey: (0x1000 + i).toString(16).padStart(16, "0"),
  };
}

// Ring page respects <= 2 per episode and advances nextCursor to the last inspected row
const rows = [
  makeRow(1, "ep-same"),
  makeRow(2, "ep-same"),
  makeRow(3, "ep-same"), // 3rd from same episode -> skipped
  makeRow(4, "ep-other"),
  makeRow(5, "ep-third"),
];
const page = feed.pickRingPage(rows, 3, false);
assert.deepEqual(
  page.picked.map((r) => r.clipid),
  ["clip-1", "clip-2", "clip-4"],
);
assert.equal(
  page.nextCursor,
  rows[3].ringKey,
  "nextCursor lands on the last consumed row so unvisited rows are not skipped",
);

// Legacy seededShuffle is deterministic for the same page and differs across pages
const sample = [1, 2, 3, 4, 5, 6, 7, 8];
assert.deepEqual(
  feed.seededShuffle(sample, 1 * 2654435761),
  feed.seededShuffle(sample, 1 * 2654435761),
);
assert.notDeepEqual(
  feed.seededShuffle(sample, 1 * 2654435761),
  feed.seededShuffle(sample, 2 * 2654435761),
);

console.log(
  JSON.stringify({
    passed: true,
    cases: [
      "cursor-parse",
      "level-parse",
      "range-validation",
      "filtered-ring-head-and-tail",
      "filtered-legacy-read-and-count",
      "ring-episode-cap",
      "ring-next-cursor",
      "legacy-shuffle-determinism",
    ],
  }),
);
