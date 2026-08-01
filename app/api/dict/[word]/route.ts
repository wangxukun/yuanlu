import { NextResponse } from "next/server";
import { dictionaryService } from "@/core/dictionary/dictionary.service";

/**
 * GET /api/dict/[word]
 *
 * Public RESTful dictionary endpoint with HTTP caching.
 * 3-tier strategy: Browser/Edge cache → PostgreSQL → DeepSeek LLM
 *
 * No authentication required — dictionary is a public resource.
 */
export async function GET(
  _request: Request,
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
    const { data, source } = await dictionaryService.lookup(decodedWord);

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
