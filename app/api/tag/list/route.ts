import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    // 获取所有标签数据（添加take限制防止全表扫描）
    const tags = await prisma.tag.findMany({
      orderBy: [
        {
          type: "desc",
        },
        {
          name: "asc",
        },
      ],
      take: 100, // 最多返回100条数据
    });
    return NextResponse.json(tags);
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/tags/list]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
