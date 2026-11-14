// HTTP contract tests; auth/DB/OSS are injected, selection and route are real.
import assert from "node:assert/strict";
import process from "node:process";
import { registerHooks } from "node:module";
const ROOT = new URL("../", import.meta.url).href;
const stubs = {
  "next/server":
    "export const NextResponse = {json: (body, init) => Response.json(body, init)};",
  "@/lib/prisma":
    "export default {corpus_clips: {findMany: async () => globalThis.dailyRouteTest.rows}};",
  "@/lib/oss": "export const signOssHttpUrl = async () => null;",
  "@/core/auth/guard":
    "export const authWithMobile = async () => globalThis.dailyRouteTest.session; export const isPremiumUser = async () => false;",
  "@/core/clips/daily-challenge.repo": `
    export const buildDailyChallengeDeps = () => globalThis.dailyRouteTest.deps;
    export const accessibleEpisodes = async () => globalThis.dailyRouteTest.episodes;
    export const latestPractice = async () => globalThis.dailyRouteTest.progress;
    export const loadAssignedClips = async () => globalThis.dailyRouteTest.rows;`,
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (stubs[specifier])
      return {
        url: "data:text/javascript," + encodeURIComponent(stubs[specifier]),
        shortCircuit: true,
      };
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
const { chinaDate } = await import("../core/clips/daily-challenge.core.ts");
const date = chinaDate();
const rows = Array.from({ length: 12 }, (_, i) => ({
  clipid: `clip-${i}`,
  episodeid: `episode-${i}`,
  subtitleId: i,
  enText: `I would like to discuss project number ${i} with you today`,
  zhText: "我想和你讨论项目",
  wordsJson: [{ word: "project", start: 0, end: 1 }],
  startTime: 0,
  endTime: 6,
  duration: 6,
  wpm: 120,
  cefrLevel: "B1",
  topicTags: [`topic-${i % 3}`],
  worthyScore: 0.8,
  sourceLabel: "Test",
  coverUrl: null,
}));
let saved = null;
globalThis.dailyRouteTest = {
  rows,
  session: null,
  progress: [],
  episodes: new Map(rows.map((r) => [r.episodeid, { isExclusive: false }])),
  deps: {
    secret: "test",
    findAssignment: async () => saved,
    saveAssignment: async (_, value) => (saved ||= { ...value, id: "saved" }),
    history: async () => [],
    vocabulary: async () => [],
    sample: async () => rows,
  },
};
process.env.NEXTAUTH_SECRET = "test";
const { POST } = await import("../app/api/clips/daily-challenge/route.ts");
const call = (body, headers = {}) =>
  POST(
    new Request("http://localhost/api/clips/daily-challenge", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers,
    }),
  );
assert.equal((await call({})).status, 400);
assert.equal((await call("{")).status, 400);
assert.equal((await call({ userid: "victim" })).status, 400);
assert.equal(
  (
    await call(
      { anonymousId: "guest_test_1234567" },
      { authorization: "Bearer stale" },
    )
  ).status,
  401,
);
assert.equal((await call("x".repeat(128 * 1024 + 1))).status, 413);
const guest = await call({ anonymousId: "guest_test_1234567" });
assert.equal(guest.headers.get("cache-control"), "private, no-store");
const guestBody = await guest.json();
assert.equal(guestBody.data.assignmentId, null);
assert.equal(guestBody.data.items.length, 5);
assert(!JSON.stringify(guestBody).includes("seedDigest"));
globalThis.dailyRouteTest.session = { user: { userid: "user-1" } };
const user = await (await call({})).json();
assert.equal(user.data.assignmentId, "saved");
assert.equal(user.data.date, date);
const chosen = user.data.items[0];
globalThis.dailyRouteTest.progress = [
  {
    episodeid: chosen.episodeid,
    subtitleId: chosen.subtitleId,
    recognitionid: 8,
    overallScore: 0,
  },
];
const progress = await (await call({})).json();
assert.equal(
  progress.data.items[0].evaluation.score,
  0,
  "Zero score is a successful evaluation",
);
globalThis.dailyRouteTest.episodes.delete(chosen.episodeid);
const revoked = await (await call({ levels: ["C2"] })).json();
assert.equal(revoked.data.items[0].available, false);
assert.equal(revoked.data.items[0].textEn, "");
assert.equal(
  revoked.data.items.length,
  5,
  "Unavailable cards retain their assigned slot",
);
assert.deepEqual(
  revoked.data.items.map((i) => i.sentenceKey),
  user.data.items.map((i) => i.sentenceKey),
);
console.log(
  JSON.stringify({
    passed: true,
    cases: [
      "input",
      "payload-limit",
      "stale-auth",
      "guest",
      "account",
      "no-store",
      "zero-score",
      "revoked-access",
      "same-day",
    ],
  }),
);
