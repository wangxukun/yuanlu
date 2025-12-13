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

    // 执行删除操作
    await prisma.podcast.delete({
      where: {
        podcastid: podcastid,
      },
    });

    return NextResponse.json(
      { message: "redirect:/admin/podcasts/delete-success" },
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
