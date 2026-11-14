import { NextResponse, type NextRequest } from "next/server";
import { signOssHttpUrl } from "@/lib/oss";
import { authWithMobile, isPremiumUser } from "@/core/auth/guard";
import { detectFastLinks, type TimedWord } from "@/core/corpus/clip-core";
import {
  chinaDate,
  parseDailyInput,
  isDailyClipUsable,
  sentenceKey,
  textHash,
  type DailyClip,
} from "@/core/clips/daily-challenge.core";
import { getDailyAssignment } from "@/core/clips/daily-challenge.service";
import {
  accessibleEpisodes,
  buildDailyChallengeDeps,
  latestPractice,
  loadAssignedClips,
} from "@/core/clips/daily-challenge.repo";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });

function buildPhoneticTip(words: TimedWord[], wpm: number): string {
  const link = detectFastLinks(words)[0];
  if (link) {
    const next = words[link.endIdx + 1]?.word;
    const phrase = next ? `${link.text} ${next}` : link.text;
    const ms = Math.round(link.durationSec * 1000);
    return ms > 0
      ? `注意 '${phrase}' 中 '${link.text}' 的弱读连读（仅 ${ms}ms），粘成一团念更地道。`
      : `注意 '${link.text}' 中的弱读连读。`;
  }
  return `本句语速 ${wpm} 词/分钟，可先慢速跟读。`;
}

/** Get-or-create today's assignment. Discover's feed and its pagination remain untouched. */
export async function POST(req: NextRequest) {
  try {
    // Bound actual payload too; Content-Length alone is not reliable.
    const reader = req.body?.getReader();
    if (!reader)
      return json({ success: false, error: "INVALID_DAILY_INPUT" }, 400);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 128 * 1024) {
        await reader.cancel();
        return json({ success: false, error: "PAYLOAD_TOO_LARGE" }, 413);
      }
      chunks.push(value);
    }
    const now = new Date();
    let input;
    try {
      input = parseDailyInput(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
        chinaDate(now),
      );
    } catch {
      return json({ success: false, error: "INVALID_DAILY_INPUT" }, 400);
    }
    const session = await authWithMobile();
    // Do not silently issue a guest result under a stale account's cache key.
    if (req.headers.has("authorization") && !session?.user?.userid)
      return json({ success: false, error: "UNAUTHORIZED" }, 401);
    const user = session?.user?.userid
      ? {
          userid: session.user.userid,
          premium: await isPremiumUser(session.user),
        }
      : null;
    if (!user && !input.anonymousId)
      return json({ success: false, error: "ANONYMOUS_ID_REQUIRED" }, 400);
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("NEXTAUTH_SECRET_NOT_CONFIGURED");
    const assignment = await getDailyAssignment(
      input,
      user,
      buildDailyChallengeDeps(secret),
      now,
    );
    const pairs = assignment.items.map((i) => ({
      episodeid: i.episodeid,
      subtitleId: i.subtitleId,
    }));
    const rows = await loadAssignedClips(pairs);
    const [episodes, progress] = await Promise.all([
      accessibleEpisodes(
        rows.map((r) => r.episodeid),
        !!user?.premium,
      ),
      user
        ? latestPractice(
            user.userid,
            pairs,
            new Date(assignment.date + "T00:00:00+08:00"),
          )
        : Promise.resolve([]),
    ]);
    const rowMap = new Map(rows.map((r) => [sentenceKey(r), r]));
    const progressMap = new Map(progress.map((r) => [sentenceKey(r), r]));
    const items = await Promise.all(
      assignment.items.map(async (chosen) => {
        const clip = rowMap.get(sentenceKey(chosen));
        const available =
          !!clip &&
          episodes.has(clip.episodeid) &&
          isDailyClipUsable(clip as DailyClip) &&
          textHash(clip.enText) === chosen.textHash;
        const p = progressMap.get(sentenceKey(chosen));
        const base = {
          ...chosen,
          sentenceKey: sentenceKey(chosen),
          available,
          evaluation: p
            ? { recognitionId: p.recognitionid, score: p.overallScore }
            : null,
        };
        if (!available || !clip)
          return {
            ...base,
            podcastTitle: "今日素材暂不可用",
            textEn: "",
            textCn: "素材或访问权限已更新，请明天继续挑战。",
            words: [],
            duration: 0,
            start: 0,
            end: 0,
            clipOffset: 0,
            clipAudioUrl: null,
          };
        const words = clip.wordsJson as unknown as TimedWord[];
        return {
          ...base,
          clipid: clip.clipid,
          podcastTitle: clip.sourceLabel || "原声节目",
          topic: clip.topicTags[0] || "",
          difficulty: clip.cefrLevel || "",
          coverUrl: await signOssHttpUrl(clip.coverUrl).catch(() => null),
          start: clip.startTime,
          end: clip.endTime,
          duration: clip.duration,
          textEn: clip.enText,
          textCn: clip.zhText,
          words,
          wpm: clip.wpm,
          phoneticTip: buildPhoneticTip(words, clip.wpm),
          isExclusive: !!episodes.get(clip.episodeid)?.isExclusive,
          // Lazy audio avoids cold ffmpeg work in selection and always rechecks the audio gateway.
          clipAudioUrl: null,
          clipOffset: clip.startTime,
        };
      }),
    );
    return json({
      success: true,
      data: {
        assignmentId: assignment.id,
        date: assignment.date,
        timezone: "Asia/Shanghai",
        algorithmVersion: assignment.algorithmVersion,
        status: assignment.status,
        fallbackStage: assignment.fallbackStage,
        samplingReason:
          assignment.fallbackStage === "normal"
            ? "normal"
            : "sample_budget_exhausted",
        items,
      },
    });
  } catch (error) {
    console.error("[POST /api/clips/daily-challenge]", error);
    return json({ success: false, error: "DAILY_CHALLENGE_UNAVAILABLE" }, 503);
  }
}
