import { NextResponse } from "next/server";
import { authWithMobile } from "@/core/auth/guard";
import { dictionaryService } from "@/core/dictionary/dictionary.service";
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

    // Tier 1: HTTP Cache-Control headers
    // DB hit: aggressive caching (browser 1 day / CDN 7 days)
    // LLM generation: shorter initial cache, stale-while-revalidate for durability
    const cacheControl =
      source === "db"
        ? "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400"
        : "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600";

    return NextResponse.json(
      { success: true, data },
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
