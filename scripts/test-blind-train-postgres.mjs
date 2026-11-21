// Run against a newly created empty local database; application credentials are never loaded.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const url = new URL(process.env.BLIND_TEST_DATABASE_URL);
assert.ok(
  ["localhost", "127.0.0.1"].includes(url.hostname) &&
    url.pathname === "/blind_train_test",
);
process.env.DATABASE_URL = url.href;
const root = new URL("../", import.meta.url);
const stub = {
  "next/server":
    "export const NextResponse = Response; export class NextRequest {}",
  "@/core/auth/guard":
    "export const requireAuth=async()=>globalThis.login; export const isPremiumUser=async()=>globalThis.premium;",
  "@/lib/oss": "export const signOssHttpUrl=async()=>null;",
  "@/core/corpus/clip-audio.service":
    "export const clipAudioService={ensureClipAudio: async()=>null};",
  "@/core/corpus/clip-audio.deps":
    "export const buildRealClipAudioDeps=()=>({});",
};
registerHooks({
  resolve(s, ctx, next) {
    if (stub[s])
      return {
        url: "data:text/javascript," + encodeURIComponent(stub[s]),
        shortCircuit: true,
      };
    if (s.startsWith("@/")) s = new URL(s.slice(2), root).href;
    if (s.startsWith("file:") || s.startsWith(".")) {
      try {
        return next(s + ".ts", ctx);
      } catch {}
    }
    return next(s, ctx);
  },
});
const sql = (statement) =>
  execFileSync("psql", [url.href, "-v", "ON_ERROR_STOP=1", "-q"], {
    input: statement,
    encoding: "utf8",
  });
sql(`CREATE TABLE "User"(userid text PRIMARY KEY);
CREATE TABLE episode (episodeid text PRIMARY KEY,status text,"isExclusive" boolean,"audioUrl" text,"audioFileName" text);
CREATE TABLE speech_recognition (userid text, recognitionid serial PRIMARY KEY, "recognitionDate" timestamptz,
 "overallScore" int, "accuracyScore" int, "fluencyScore" int, "integrityScore" int, speed int);
INSERT INTO speech_recognition(userid,"recognitionDate","overallScore","fluencyScore")
 SELECT 'a',now()-interval '3 days',80,80 FROM generate_series(1,6);
CREATE TABLE corpus_clips (clipid text PRIMARY KEY,episodeid text,"subtitleId" int,"startTime" float8,"endTime" float8,
duration float8,"enText" text,"zhText" text,"wordsJson" jsonb,wpm int,"cefrLevel" text,"coverUrl" text,"sourceLabel" text,"topicTags" text[],"worthyScore" float8);
INSERT INTO "User" VALUES ('a'),('b');
INSERT INTO episode VALUES ('ep','published',false,'audio',null),('vip','published',true,'audio',null);
INSERT INTO corpus_clips SELECT i::text,CASE WHEN i=33 THEN 'vip' ELSE 'ep' END,i,1,CASE WHEN i=32 THEN 9.001 WHEN i=31 THEN 5.999 WHEN i=1 THEN 6 ELSE 9 END,
12,'This is the first time we have seen this','这是第一次','[]',120,CASE WHEN i=4 THEN 'B2' ELSE 'B1' END,null,null,'{}',1 FROM generate_series(1,33)i;`);
sql(
  readFileSync(
    new URL(
      "prisma/migrations/20261121190000_blind_train_log/migration.sql",
      root,
    ),
    "utf8",
  ),
);
const { GET, POST } = await import("../app/api/clips/blind-train/route.ts");
const { default: prisma } = await import("../lib/prisma.ts");
async function pages(level = "") {
  let cursor = "";
  const ids = [];
  do {
    const r = await GET({
      nextUrl: new URL("http://local/?level=" + level + "&cursor=" + cursor),
    });
    assert.equal(r.status, 200);
    const { data } = await r.json();
    ids.push(...data.items.map((x) => x.clipid));
    cursor = data.hasMore ? data.nextCursor : "";
  } while (cursor);
  assert.equal(ids.length, new Set(ids).size);
  return ids;
}
try {
  globalThis.login = {
    ok: false,
    response: new Response(null, { status: 401 }),
  };
  assert.equal((await GET({})).status, 401);
  globalThis.login = { ok: true, session: { user: { userid: "a" } } };
  const all = await pages();
  assert.equal(all.length, 30);
  assert.ok(
    all.includes("1") &&
      !all.includes("31") &&
      !all.includes("32") &&
      !all.includes("33"),
  );
  assert.deepEqual(await pages(), all);
  assert.deepEqual(await pages("B2"), ["4"]);
  const page = await GET({ nextUrl: new URL("http://local/") })
    .then((r) => r.json())
    .then((b) => b.data);
  const first = page.items[0];
  const attempt = {
    clipid: first.clipid,
    day: page.day,
    level: "",
    position: 1,
    cursor: first.ringKey,
  };
  await POST({ json: async () => attempt });
  await POST({ json: async () => attempt });
  assert.equal(
    await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM blind_train_log`.then(
      (rows) => rows[0].n,
    ),
    1,
  );
  const resumed = await GET({ nextUrl: new URL("http://local/?resume=1") })
    .then((r) => r.json())
    .then((b) => b.data);
  assert.equal(resumed.firstNumber, 2);
  assert.equal(resumed.items[0].clipid, all[1]);
  sql("UPDATE blind_train_log SET day=day-1");
  assert.ok(!(await pages()).includes(first.clipid));
  globalThis.login.session.user.userid = "b";
  assert.notDeepEqual(await pages(), all);
  assert.deepEqual(await pages("B2"), ["4"]);
  globalThis.premium = true;
  assert.ok((await pages()).includes("33"));
  console.log(
    "Blind training PostgreSQL route, migration, pagination, access and practice log OK",
  );
} finally {
  await prisma.$disconnect();
}
