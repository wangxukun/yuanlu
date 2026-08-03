import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.userid) {
      return NextResponse.json(
        { success: false, message: "未认证用户" },
        { status: 401 },
      );
    }

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
