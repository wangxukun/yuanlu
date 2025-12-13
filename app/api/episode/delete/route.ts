import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    // 1. 解析请求体获取 episodeid
    const { episodeid } = await request.json();

    // 2. 验证参数有效性
    if (!episodeid) {
      console.error("Invalid episode ID", episodeid);
      return NextResponse.json(
        { error: "Invalid episode ID" },
        { status: 400 },
      );
    }

    // 3. 执行删除操作
    // 注意：不再需要手动删除 tags 或 comments。
    // 因为 schema.prisma 中已配置 onDelete: Cascade，数据库会自动清理关联数据。
    // 对于隐式多对多标签，Prisma 也会自动清理关联关系。
    await prisma.episode.delete({
      where: {
        episodeid: episodeid,
      },
    });

    return NextResponse.json(
      { message: "redirect:/admin/episodes/delete-success" },
      { status: 200 },
    );
  } catch (error) {
    // 类型守卫函数
    function isPrismaError(err: unknown): err is { code: string } {
      return typeof err === "object" && err !== null && "code" in err;
    }
    // 处理记录不存在的情况 (Prisma error code P2025)
    if (isPrismaError(error) && error.code === "P2025") {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
