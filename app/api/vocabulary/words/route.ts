import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/core/auth/guard";

export async function GET() {
  try {
    // 移动端 Bearer 兼容：Cookie 优先、Bearer 兜底（对齐 guard.ts requireAuth）
    const authResult = await requireAuth();
    if (!authResult.ok) {
      return authResult.response;
    }
    const session = authResult.session;

    const list = await prisma.vocabulary.findMany({
      where: {
        userid: session.user.userid,
      },
      select: {
        word: true,
      },
    });

    const words = Array.from(
      new Set(list.map((item) => item.word.toLowerCase())),
    );

    return NextResponse.json({ success: true, data: words });
  } catch (error) {
    console.error("Fetch global vocabulary words error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
