// app/api/podcast/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchPodcasts } from "@/core/podcast/podcast-search.service";
import type { PodcastSearchResponseDto } from "@/core/podcast/podcast-search.dto";

/**
 * GET /api/podcast/search?q=xxx&limit=20
 * Public endpoint for searching podcasts by title, description, and tags.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    if (!query.trim()) {
      const response: PodcastSearchResponseDto = {
        success: true,
        data: [],
        query: "",
        total: 0,
      };
      return NextResponse.json(response);
    }

    const results = await searchPodcasts({ query, limit });

    const response: PodcastSearchResponseDto = {
      success: true,
      data: results,
      query,
      total: results.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/podcast/search]", error);
    const errorResponse: PodcastSearchResponseDto = {
      success: false,
      data: [],
      query: "",
      total: 0,
      error: "Internal Server Error",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
