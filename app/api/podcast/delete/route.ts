import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    // 解析请求体获取 categoryid
    const { podcastid } = await request.json();

    // 验证参数有效性
    if (!podcastid) {
      console.error("Invalid podcast ID", podcastid);
      return NextResponse.json(
        { error: "Invalid podcast ID" },
        { status: 400 },
      );
    }

    // 删除 podcast_tags 表中的关联记录
    await prisma.podcast_tags.deleteMany({
      where: {
        podcastid: podcastid,
      },
    });

    // 执行删除操作
    const deletedPodcast = await prisma.podcast.deleteMany({
      where: {
        podcastid: podcastid,
      },
    });

    // 检查是否成功删除
    if (deletedPodcast.count === 0) {
      return NextResponse.json({ error: "Podcast not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "redirect:/dashboard/podcasts/delete-success" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
