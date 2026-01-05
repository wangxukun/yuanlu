import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // 获取所有分类数据（添加take限制防止全表扫描）
    const users = await prisma.user.findMany({
      select: {
        // 明确选择需要字段
        userid: true,
        email: true,
        password: true,
        role: true,
        createAt: true,
        updateAt: true,
        isOnline: true,
        lastActiveAt: true,
        isCommentAllowed: true,
        emailVerified: true,
        user_profile: {
          select: {
            // 明确选择需要字段
            nickname: true,
            avatarUrl: true,
            avatarFileName: true,
            bio: true,
            learnLevel: true,
          },
        },
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/user/list]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
