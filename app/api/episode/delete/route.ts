import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    // 解析请求体获取 episodeid
    const { episodeid } = await request.json();

    // 验证参数有效性
    if (!episodeid) {
      console.error("Invalid episode ID", episodeid);
      return NextResponse.json(
        { error: "Invalid episode ID" },
        { status: 400 },
      );
    }

    // 执行删除操作
    const deletedEpisode = await prisma.episode.deleteMany({
      where: {
        episodeid: episodeid,
      },
    });

    // 检查是否成功删除
    if (deletedEpisode.count === 0) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "redirect:/dashboard/episodes/delete-success" },
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
