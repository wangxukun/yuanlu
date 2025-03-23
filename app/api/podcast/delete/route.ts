import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    // 解析请求体获取 categoryid
    const { categoryid } = await request.json();

    // 验证参数有效性
    if (!categoryid || isNaN(categoryid)) {
      console.error("Invalid category ID", categoryid);
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 },
      );
    }

    // 执行删除操作
    const deletedPodcast = await prisma.category.deleteMany({
      where: {
        categoryid: categoryid,
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
