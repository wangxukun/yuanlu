import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const episodeid = req.nextUrl.searchParams.get("episodeid");
  const userid = req.nextUrl.searchParams.get("userid");
  console.log("[GET /api/episode/favorite/find-unique]", episodeid, userid);

  // 验证参数有效性
  if (!episodeid || !userid) {
    console.error("Invalid episode ID or User ID", episodeid, userid);
    return NextResponse.json({
      success: false,
      message: "Invalid episode ID or User ID",
      status: 400,
    });
  }
  try {
    const episode_favorite = await prisma.episode_favorites.findFirst({
      where: {
        episodeid: episodeid,
        userid: userid,
      },
      select: {
        // 明确选择需要字段
        favoriteid: true,
        userid: true,
        episodeid: true,
        favoriteDate: true,
      },
    });
    if (!episode_favorite) {
      return NextResponse.json({
        success: false,
        message: "Podcast favorite not found",
        episode_favorite: null,
      });
    }
    return NextResponse.json({
      success: true,
      message: "Episode favorite found:",
      episode_favorite: episode_favorite,
    });
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/episode/favorite/find-unique]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
