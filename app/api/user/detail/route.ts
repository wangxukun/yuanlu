import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  console.log("[GET /api/user/detail]", id);

  // 验证参数有效性
  if (!id) {
    console.error("Invalid user ID", id);
    return NextResponse.json({ error: "Invalid user ID", status: 400 });
  }
  try {
    const user = await prisma.user.findFirst({
      where: {
        userid: id,
      },
      select: {
        // 明确选择需要字段
        userid: true,
        email: true,
        password: true,
        role: true,
        languagePreference: true,
        createAt: true,
        updateAt: true,
        isOnline: true,
        lastActiveAt: true,
        isCommentAllowed: true,
        emailVerified: true,
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/user/detail]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
