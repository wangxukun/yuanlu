import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  console.log("[GET /api/podcast/detail]", id);

  // 验证参数有效性
  if (!id || isNaN(id)) {
    console.error("Invalid category ID", id);
    return NextResponse.json({ error: "Invalid category ID", status: 400 });
  }
  try {
    const podcast = await prisma.category.findFirst({
      where: {
        categoryid: id,
      },
      select: {
        // 明确选择需要字段
        categoryid: true,
        title: true,
        coverUrl: true,
        coverFileName: true,
        description: true,
        from: true,
        episode: {
          select: {
            episodeid: true,
            title: true,
            description: true,
            coverUrl: true,
            coverFileName: true,
            duration: true,
            audioUrl: true,
            audioFileName: true,
            subtitleEnUrl: true,
            subtitleEnFileName: true,
            subtitleZhUrl: true,
            subtitleZhFileName: true,
            publishAt: true,
            createAt: true,
            status: true,
            isExclusive: true,
          },
        },
      },
    });
    return NextResponse.json(podcast);
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/podcast/detail]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
