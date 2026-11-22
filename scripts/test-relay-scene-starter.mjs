import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Run the real create/read path with in-memory database and storage adapters.
const root = new URL("../", import.meta.url);
const mocks = new Map([
  ["@/lib/prisma", "export default globalThis.relayTestDb;"],
  [
    "@/lib/oss",
    "export const uploadFile = async () => ({ fileName: 'voice.wav' }), generateSignatureUrl = async key => 'signed/' + key;",
  ],
]);
registerHooks({
  resolve(spec, ctx, next) {
    if (mocks.has(spec)) return { url: "mock:" + spec, shortCircuit: true };
    if (spec.startsWith("@/")) spec = new URL(spec.slice(2) + ".ts", root).href;
    if (spec === "./scene-starter") spec += ".ts";
    return next(spec, ctx);
  },
  load(url, ctx, next) {
    if (url.startsWith("mock:"))
      return {
        format: "module",
        source: mocks.get(url.slice(5)),
        shortCircuit: true,
      };
    return next(url, ctx);
  },
});
const scene = {
  sceneid: "scene-a",
  episodeid: "episode",
  title: "Directions",
  situationTag: "travel",
  cefrLevel: "B1",
  clipsJson: {
    clips: [
      {
        start: 23,
        end: 25,
        subtitleId: 0,
        clipid: "corpus-a",
        textEn: "First.",
      },
      {
        start: 23,
        end: 25,
        subtitleId: 1,
        textEn: "Next stop.",
        words: [{ word: "Next", start: 23.5, end: 24 }],
      },
      { start: 25.125, end: 26, textEn: "Yes." },
    ],
  },
};
const companions = ["corpus-a", "b", "c"].map((clipid, i) => ({
  clipid,
  episodeid: "ep" + i,
  subtitleId: i,
  enText: "Let us take a different route.",
  duration: 4,
  startTime: 0,
  endTime: 4,
  topicTags: [],
  wordsJson: [],
  wpm: 100,
}));
let room;
let sceneQueries = 0;
globalThis.relayTestDb = {
  micro_scenes: {
    findMany: ({ where }) => {
      sceneQueries++;
      return where.sceneid.in.includes(scene.sceneid) ? [scene] : [];
    },
  },
  corpus_clips: {
    findUnique: ({ where }) =>
      companions.find((c) => c.clipid === where.clipid),
    findMany: ({ where }) =>
      companions.filter((c) =>
        where.clipid.in
          ? where.clipid.in.includes(c.clipid)
          : c.clipid !== where.clipid.not,
      ),
  },
  episode: { findMany: () => [] },
  user: { findMany: () => [] },
  social_likes: { findMany: () => [], groupBy: () => [] },
  speech_recognition: {
    findUnique: () => ({ userid: "learner", overallScore: 92 }),
  },
  relay_room: {
    findFirst: ({ where }) =>
      room?.starterClipId === where.starterClipId ? room : null,
    create: ({ data }) =>
      (room = {
        ...data,
        roomid: "room",
        segments: data.segments.create.map((seg) => ({
          ...seg,
          segid: String(seg.stepOrder),
          createdAt: new Date(),
        })),
      }),
  },
};
const { loadSceneStarters, sceneStarterId } = await import(
  "../core/relay/scene-starter.ts"
);
const { createRoom } = await import("../core/relay/relay.service.ts");
assert.deepEqual(await loadSceneStarters(["corpus-a"]), []);
assert.equal(sceneQueries, 0);
const id = sceneStarterId("scene-a", 23, 1);
const fallback = sceneStarterId("scene-a", 25.125, null);
const rows = await loadSceneStarters([id, id, fallback, "ms:scene-a:s999"]);
assert.deepEqual(
  rows.map((c) => c.enText),
  ["Next stop.", "Yes."],
);
assert.equal(sceneQueries, 1);
const start = (clipId) =>
  createRoom({
    userid: "learner",
    clipId,
    recognitionId: 7,
    audioBase64: Buffer.alloc(32044).toString("base64"),
  });
assert.equal((await start("ms:scene-a:s999")).code, "CLIP_NOT_FOUND");
const created = await start(id);
assert.equal(created.ok, true);
const view = created.data.room;
assert.equal(view.starterClipId, id);
assert.equal(view.segments.length, 2);
const first = view.segments[0];
assert.equal(first.textEn, "Next stop.");
assert.equal(first.audioUrl, "signed/voice.wav");
assert.equal(first.score, 92);
assert.deepEqual(first.words, [{ word: "Next", start: 0.25, end: 0.5 }]);
assert.ok(view.nextPromptSegment.clipid);
assert.equal((await start(id)).code, "DUPLICATE_STARTER");
assert.equal(
  (await start(sceneStarterId("scene-a", 23, 0))).data.room.starterClipId,
  "corpus-a",
);
assert.equal((await start("corpus-a")).code, "DUPLICATE_STARTER");
console.log(
  "接力建房通过：同起点不同字幕、无字幕编号回退、原句和录音回读、重复领读与无效引用。",
);
