import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth, isPremiumUser } from "@/core/auth/guard";
import { chinaToday } from "@/core/utils/china-date";
import {
  CEFR_EPISODE_MAPPING,
  speechProfileService,
} from "@/core/speech-profile/speech-profile.service";
import {
  hydrateReelsItems,
  isCleanReelsRow,
  type ReelsClipRow,
} from "@/core/corpus/reels-feed.service";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 12;
const CHUNK = 64;
const response = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = auth.session.user;
  const day = chinaToday().toISOString().slice(0, 10);
  const params = req.nextUrl.searchParams;
  const level = params.get("level") || "";
  let cursor = params.get("cursor") || "";
  if (
    (cursor && !/^[a-f0-9]{32}$/.test(cursor)) ||
    (level && !/^[ABC][12]$/.test(level))
  )
    return response({ success: false, error: "无效的选题条件" }, 400);
  if (params.get("day") && params.get("day") !== day) cursor = "";
  let firstNumber = 1;
  if (!cursor && params.get("resume") === "1") {
    const [last] = await prisma.$queryRaw<
      { position: number; cursor: string }[]
    >`
      SELECT position, cursor FROM blind_train_log WHERE userid = ${user.userid} AND day = ${day}::date
        AND level = ${level} ORDER BY position DESC LIMIT 1`;
    if (last) {
      cursor = last.cursor;
      firstNumber = last.position + 1;
    }
  }
  const startCursor = cursor;
  const seed = user.userid + ":" + day + ":";
  const profile = level
    ? null
    : await speechProfileService.getDerivedLevel(
        user.userid,
        new Date(day + "T00:00:00+08:00"),
      );
  const preferred = profile ? CEFR_EPISODE_MAPPING[profile] : [];
  const hash = Prisma.sql`md5(${seed} || c.clipid) COLLATE "C"`;
  // 适配难度取两个确定性散列的较小值，提高前排概率，同时保留其他难度。
  const rank = preferred?.length
    ? Prisma.sql`(CASE WHEN c."cefrLevel" IN (${Prisma.join(preferred)})
    THEN LEAST(${hash}, md5(${seed + "cefr:"} || c.clipid) COLLATE "C") ELSE ${hash} END)`
    : hash;
  const premium = await isPremiumUser(user);
  const picked: ReelsClipRow[] = [];
  while (picked.length <= PAGE_SIZE) {
    const rows: ReelsClipRow[] = await prisma.$queryRaw`
      SELECT c.clipid, c.episodeid, c."subtitleId", c."startTime", c."endTime",
        c.duration, c."enText", c."zhText", c."wordsJson", c.wpm, c."cefrLevel",
        c."coverUrl", c."sourceLabel", c."topicTags", ${rank} AS "ringKey"
      FROM corpus_clips c JOIN episode e USING (episodeid)
      WHERE e.status = 'published' AND (e."audioUrl" <> '' OR e."audioFileName" <> '')
        AND (${premium} OR e."isExclusive" IS NOT TRUE)
        AND c."startTime" >= 0 AND round((c."endTime"*1000)::numeric)-round((c."startTime"*1000)::numeric) BETWEEN 5000 AND 8000
        AND btrim(c."zhText") <> '' AND c."enText" ~ '[A-Za-z]'
        AND (c."worthyScore" IS NULL OR c."worthyScore" >= 0.4)
        ${level ? Prisma.sql`AND c."cefrLevel" = ${level}` : Prisma.empty}
        AND NOT EXISTS (SELECT 1 FROM blind_train_log l WHERE l.userid = ${user.userid}
          AND l.clipid = c.clipid AND l.day BETWEEN ${day}::date - 7 AND ${day}::date - 1)
        AND ${rank} > ${cursor} ORDER BY ${rank} LIMIT ${CHUNK}`;
    picked.push(
      ...rows.filter((row) =>
        isCleanReelsRow({ ...row, duration: row.endTime - row.startTime }),
      ),
    );
    if (rows.length < CHUNK) break;
    cursor = rows[rows.length - 1].ringKey!;
  }
  const items = await hydrateReelsItems(picked.slice(0, PAGE_SIZE), true, 0);
  return response({
    success: true,
    data: {
      day,
      items,
      startCursor,
      firstNumber,
      hasMore: picked.length > PAGE_SIZE,
      nextCursor: items.at(-1)?.ringKey || "",
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (
    typeof body?.clipid !== "string" ||
    !body.clipid ||
    body.clipid.length > 128 ||
    !Number.isSafeInteger(body.position) ||
    body.position < 1 ||
    body.position > 2147483646 ||
    typeof body.level !== "string" ||
    !/^(?:[ABC][12])?$/.test(body.level) ||
    typeof body.cursor !== "string" ||
    !/^[a-f0-9]{32}$/.test(body.cursor)
  )
    return response({ success: false, error: "无效的切片" }, 400);
  const day = chinaToday().toISOString().slice(0, 10);
  if (body.day !== day)
    return response({ success: false, error: "题目已跨日" }, 409);
  await prisma.$executeRaw`INSERT INTO blind_train_log (userid, clipid, day, level, position, cursor)
    SELECT ${auth.session.user.userid}, c.clipid, ${day}::date, ${body.level}, ${body.position}, ${body.cursor}
    FROM corpus_clips c WHERE c.clipid = ${body.clipid}
    ON CONFLICT DO NOTHING`;
  return response({ success: true });
}
