// Unit tests for core/corpus/reels-feed.service.ts (cursor validation, ring page picking, legacy shuffle).
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const ROOT = new URL("../", import.meta.url).href;
const stubs = {
  "@/lib/prisma": "export default {};",
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
      "ring-episode-cap",
      "ring-next-cursor",
      "legacy-shuffle-determinism",
    ],
  }),
);
