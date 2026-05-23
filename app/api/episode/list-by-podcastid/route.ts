import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { episodeService } from "@/core/episode/episode.service";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const podcastId = searchParams.get("podcastId");

  if (!podcastId) {
    return NextResponse.json(
      { success: false, error: "podcastId is required" },
      { status: 400 },
    );
  }

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const search = searchParams.get("search") || "";
  const sort = (searchParams.get("sort") === "asc" ? "asc" : "desc") as
    | "asc"
    | "desc";

  try {
    const session = await auth();
    const userId = session?.user?.userid;

    const result = await episodeService.getPodcastEpisodes(podcastId, {
      page,
      limit,
      search,
      sort,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[GET /api/episode/list-by-podcastid] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
