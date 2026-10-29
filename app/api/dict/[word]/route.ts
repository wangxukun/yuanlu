import { NextResponse } from "next/server";
import { authWithMobile } from "@/core/auth/guard";
import prisma from "@/lib/prisma";
import { dictionaryService } from "@/core/dictionary/dictionary.service";
import { refineWordExamples } from "@/core/studio/curator.core";
import { hasSensitiveTerm } from "@/core/corpus/clip-core";
import {
  checkDictionaryQuota,
  recordDictionaryLookup,
  anonymousLlmRateAllow,
} from "@/lib/dictionary-quota";
import {
  DICTIONARY_QUOTA_EXCEEDED,
  FREE_DICTIONARY_DAILY_LIMIT,
} from "@/lib/quota";
import { recordConversionEvent } from "@/lib/track";

/**
 * GET /api/dict/[word]
 *
 * Public RESTful dictionary endpoint with HTTP caching.
 * 3-tier strategy: Browser/Edge cache → PostgreSQL → DeepSeek LLM
 *
 * 配额策略：
 * - 缓存命中（DB/HTTP 缓存）：零成本，任何人可查、不计数
 * - 缓存未命中（触发 LLM 生成）：
 *   - 登录用户计入每日词典配额（免费 30 次/天，会员无限）
 *   - 匿名用户按 IP 做尽力而为限流（内存计数，防枚举刷 LLM）
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ word: string }> },
) {
  try {
    const { word } = await params;

    if (!word || word.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Word parameter is required" },
        { status: 400 },
      );
    }

    const decodedWord = decodeURIComponent(word);

    // 计费路径判定：缓存未命中才会触发 LLM 生成
    const cached = await dictionaryService.isCached(decodedWord);
    if (!cached) {
      const session = await authWithMobile();
      if (session?.user?.userid) {
        if (!(await checkDictionaryQuota(session.user))) {
          await recordConversionEvent({
            eventType: "QUOTA_BLOCKED",
            source: "dictionary_daily",
            userid: session.user.userid,
          });
          return NextResponse.json(
            {
              success: false,
              error: "Quota exceeded",
              code: DICTIONARY_QUOTA_EXCEEDED,
              message: `今日 ${FREE_DICTIONARY_DAILY_LIMIT} 次免费词典查询已用完，升级会员解锁无限查询！`,
            },
            { status: 403 },
          );
        }
      } else {
        const forwarded = request.headers.get("x-forwarded-for");
        const ip = forwarded ? forwarded.split(",")[0].trim() : "local";
        if (!anonymousLlmRateAllow(ip)) {
          return NextResponse.json(
            { success: false, error: "Too many requests, try tomorrow" },
            { status: 429 },
          );
        }
      }
    }

    const { data, source } = await dictionaryService.lookup(decodedWord);

    // LLM 生成成功才计入登录用户当日配额（缓存命中不计数）
    if (source === "llm") {
      const session = await authWithMobile();
      if (session?.user?.userid) {
        await recordDictionaryLookup(session.user.userid, "llm", decodedWord);
      }
    }

    // [活体词典] 真实语境例句：语料切片按词检索（append-only 字段）。
    // 合规红线：只返回切片 ID + 双语文本 + 词级时间戳，绝不返回音频 URL
    // ——播放由小程序经 /api/clips/{clipid}/audio 网关按需现切（≤45s 硬闸）。
    // 纯 DB 检索不计词典配额；语料未就绪/查询失败静默降级为空数组。
    let corpusExamples: unknown[] = [];
    try {
      const candidates = await prisma.corpus_clips.findMany({
        where: { enText: { contains: decodedWord, mode: "insensitive" } },
        select: {
          clipid: true,
          episodeid: true,
          subtitleId: true,
          enText: true,
          zhText: true,
          startTime: true,
          endTime: true,
          duration: true,
          cefrLevel: true,
          wordsJson: true,
        },
        orderBy: { wpm: "asc" },
        take: 30,
      });
      corpusExamples = refineWordExamples(
        decodedWord,
        candidates.filter(
          (c) => !hasSensitiveTerm(c.enText) && !hasSensitiveTerm(c.zhText),
        ),
        3,
      ).map((c) => ({
        clipid: c.clipid,
        episodeid: c.episodeid,
        subtitleId: c.subtitleId,
        enText: c.enText,
        zhText: c.zhText,
        startTime: c.startTime,
        endTime: c.endTime,
        duration: c.duration,
        cefrLevel: c.cefrLevel,
        words: c.wordsJson || [],
      }));
    } catch (e) {
      console.error("[Dictionary API] corpus examples failed:", e);
    }

    // Tier 1: HTTP Cache-Control headers
    // DB hit: aggressive caching (browser 1 day / CDN 7 days)
    // LLM generation: shorter initial cache, stale-while-revalidate for durability
    const cacheControl =
      source === "db"
        ? "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400"
        : "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600";

    return NextResponse.json(
      { success: true, data: { ...data, corpusExamples } },
      {
        headers: {
          "Cache-Control": cacheControl,
        },
      },
    );
  } catch (error) {
    console.error("[Dictionary API] Error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
