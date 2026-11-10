import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { signOssHttpUrl } from "@/lib/oss";
import {
  detectFastLinks,
  hasSensitiveTerm,
  type TimedWord,
} from "@/core/corpus/clip-core";
import { isJunkClip } from "@/core/studio/curator.core";
import { clipAudioService } from "@/core/corpus/clip-audio.service";
import { buildRealClipAudioDeps } from "@/core/corpus/clip-audio.deps";

/**
 * [REELS] GET /api/clips/feed — 原声微流切片流（SoundBite Reels）。
 *
 * Query: page=1&pageSize=12&level=B1,B2（level 可选，逗号多选 cefrLevel）
 * 200 { success, data: { items[], page, pageSize, hasMore } }
 * item = { clipid, episodeid, subtitleId, podcastTitle, topic, difficulty,
 *          coverUrl(签), start, end, duration, textEn, textCn, words[],
 *          wpm, isExclusive, clipAudioUrl(签|null), clipOffset }
 *
 * 选料口径（对齐微流意图：每条 4～10s 纯正原生单句）：
 *   - DB 硬过滤：duration∈[4,10]s + wordsJson 非空（扫光必需）+ zhText 非空；
 *   - isJunkClip 语料门禁（4-10s 窗口版）：词表式碎句/功能词缺失/语速异常出局
 *     （与 semantic-search 同一函数，选项收窄到微流窗口）；
 *   - hasSensitiveTerm 红线词双语文本过滤（读取侧兜底，同 scenes/feed）；
 *   - 每集 ≤2 条（刷感跨节目不重样）+ 页种子确定性乱序（同页稳定翻页）。
 *
 * 音频契约对齐 semantic-search 实体：clipAudioUrl 前 3 条预签（首刷即播，
 * 冷缓存时并行懒切片）；其余 null——客户端滑到该条时经
 * /api/clips/{id}/audio 懒取（OSS 永久缓存，二次滑过即直连秒播）。
 * 单一切片出口铁律不破：预签也走 clipAudioService.ensureClipAudio。
 * 无需登录（转化入口）；专享剧集标 isExclusive，播放门禁在音频网关。
 */
const REELS_MIN_SEC = 4;
const REELS_MAX_SEC = 10;
const OVERFETCH = 15; // 池放大倍数：批量建库同刻同集密集，需大池才能跨集凑满（实测 60 行仅 3 集）
const PRE_SIGN_AUDIO = 3; // 预签音频条数（首刷即播窗口）

/**
 * 数据驱动连读提示：detectFastLinks 在词级时间戳上实测出的弱读连读块
 * （功能词 <130ms），非 LLM 编造——刷练卡片上的「连读机密」pill 文案源。
 */
function buildPhoneticTip(words: TimedWord[], wpm: number): string | null {
  const links = detectFastLinks(words);
  if (links.length) {
    const b = links[0];
    const next = words[b.endIdx + 1]?.word;
    const phrase = next ? `${b.text} ${next}` : b.text;
    return `注意 '${phrase}' 中 '${b.text}' 的弱读连读（仅 ${Math.round(b.durationSec * 1000)}ms），粘成一团念更地道。`;
  }
  if (wpm > 0) {
    return `本句语速 ${wpm} 词/分钟，建议 0.75x 慢速跟上后再常速跟读。`;
  }
  return null;
}

/** 页种子确定性乱序（mulberry32）：同一页翻回结果稳定，跨页不重样 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  let a = 0x9e3779b9 ^ seed;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(
      30,
      Math.max(1, Number(sp.get("pageSize")) || 12),
    );
    // 难度多选：level=B1,B2 → 逐 token 校验（A1–C2），脏 token 静默丢弃
    const levels = (sp.get("level") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-C][12]$/.test(s))
      .slice(0, 6);

    const where = {
      duration: { gte: REELS_MIN_SEC, lte: REELS_MAX_SEC },
      // Json 列非 DB NULL 的 Prisma 写法（词级时间戳缺失的行不入池）
      wordsJson: { not: Prisma.DbNull },
      zhText: { not: null },
      ...(levels.length ? { cefrLevel: { in: levels } } : {}),
      // [T3.3] worthyScore 门禁（考卷定标 th=0.4；null 未判不误杀）
      OR: [{ worthyScore: { gte: 0.4 } }, { worthyScore: null }],
    };

    // 候选池：稳定排序（createdAt 批量建库同刻，clipid 决胜）+ 池放大
    const poolSize = pageSize * OVERFETCH;
    const [rows, total] = await Promise.all([
      prisma.corpus_clips.findMany({
        where,
        select: {
          clipid: true,
          episodeid: true,
          subtitleId: true,
          startTime: true,
          endTime: true,
          duration: true,
          enText: true,
          zhText: true,
          wordsJson: true,
          wpm: true,
          cefrLevel: true,
          coverUrl: true,
          sourceLabel: true,
          topicTags: true,
        },
        orderBy: [{ createdAt: "desc" }, { clipid: "asc" }],
        skip: (page - 1) * poolSize,
        take: poolSize,
      }),
      prisma.corpus_clips.count({ where }),
    ]);

    // 语料门禁 + 红线词 → 页种子乱序 → 每集 ≤2 → 截 pageSize
    const clean = rows.filter(
      (r) =>
        !isJunkClip(r, {
          minDurationSec: REELS_MIN_SEC,
          maxDurationSec: REELS_MAX_SEC,
        }) &&
        !hasSensitiveTerm(r.enText) &&
        !hasSensitiveTerm(r.zhText),
    );
    const shuffled = seededShuffle(clean, page * 2654435761);
    const perEpisode = new Map<string, number>();
    const picked = [];
    for (const r of shuffled) {
      const n = perEpisode.get(r.episodeid) || 0;
      if (n >= 2) continue;
      perEpisode.set(r.episodeid, n + 1);
      picked.push(r);
      if (picked.length >= pageSize) break;
    }

    // 专享标记：批量查剧集（feed 不拦，播放门禁在音频网关；客户端据此亮徽章）
    const episodeIds = [...new Set(picked.map((r) => r.episodeid))];
    const exclusiveMap = new Map<string, boolean>();
    if (episodeIds.length) {
      const eps = await prisma.episode.findMany({
        where: { episodeid: { in: episodeIds } },
        select: { episodeid: true, isExclusive: true },
      });
      eps.forEach((e) => exclusiveMap.set(e.episodeid, !!e.isExclusive));
    }

    // 前 N 条预签切片直链（冷缓存并行懒切片；失败置 null 走客户端懒取）
    const preAudio = new Map<string, { url: string; clipOffset: number }>();
    await Promise.all(
      picked.slice(0, PRE_SIGN_AUDIO).map(async (r) => {
        const audio = await clipAudioService
          .ensureClipAudio(r.clipid, buildRealClipAudioDeps())
          .catch(() => null);
        if (audio && audio.ok) {
          preAudio.set(r.clipid, {
            url: audio.url,
            clipOffset: audio.clipOffset,
          });
        }
      }),
    );

    const items = await Promise.all(
      picked.map(async (r) => {
        const pre = preAudio.get(r.clipid);
        const words = (
          Array.isArray(r.wordsJson) ? r.wordsJson : []
        ) as TimedWord[];
        return {
          clipid: r.clipid,
          episodeid: r.episodeid,
          subtitleId: r.subtitleId,
          podcastTitle: r.sourceLabel || "原声节目",
          topic: r.topicTags && r.topicTags.length ? r.topicTags[0] : "",
          difficulty: r.cefrLevel || "",
          coverUrl: await signOssHttpUrl(r.coverUrl),
          start: r.startTime,
          end: r.endTime,
          duration: r.duration,
          textEn: r.enText,
          textCn: r.zhText,
          words,
          phoneticTip: buildPhoneticTip(words, r.wpm),
          wpm: r.wpm,
          isExclusive: exclusiveMap.get(r.episodeid) || false,
          clipAudioUrl: pre ? pre.url : null,
          // 预签条带精确 cutStart；懒取条先给 startTime 近似，客户端网关取回后覆盖
          clipOffset: pre ? pre.clipOffset : r.startTime,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        items,
        page,
        pageSize,
        hasMore: page * poolSize < total,
      },
    });
  } catch (error) {
    console.error("[GET /api/clips/feed]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch clips feed" },
      { status: 500 },
    );
  }
}
