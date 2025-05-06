import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const podcastid = req.nextUrl.searchParams.get("podcastid");
  const userid = req.nextUrl.searchParams.get("userid");
  console.log("[GET /api/podcast/favorite/find-unique]", podcastid, userid);

  // 验证参数有效性
  if (!podcastid || !userid) {
    console.error("Invalid podcast ID or User ID", podcastid, userid);
    return NextResponse.json({
      success: false,
      message: "Invalid podcast ID or User ID",
      status: 400,
    });
  }
  try {
    const podcast_favorite = await prisma.podcast_favorites.findFirst({
      where: {
        podcastid: podcastid,
        userid: userid,
      },
      select: {
        // 明确选择需要字段
        favoriteid: true,
        userid: true,
        podcastid: true,
        favoriteDate: true,
      },
    });
    if (!podcast_favorite) {
      return NextResponse.json({
        success: false,
        message: "Podcast favorite not found",
        podcast_favorite: null,
      });
    }
    return NextResponse.json({
      success: true,
      message: "Podcast favorite found:",
      podcast_favorite: podcast_favorite,
    });
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/podcast/favorite/find-unique]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
