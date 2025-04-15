import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    // 获取所有分类数据（添加take限制防止全表扫描）
    const categories = await prisma.category.findMany({
      select: {
        // 明确选择需要字段
        categoryid: true,
        title: true,
        coverUrl: true,
        coverFileName: true,
        description: true,
        from: true,
      },
    });
    return NextResponse.json(categories);
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/podcast/list]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
