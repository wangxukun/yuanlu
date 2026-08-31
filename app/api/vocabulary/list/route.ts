import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/core/auth/guard";

export async function GET(request: Request) {
  try {
    // Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;
    const userid = authResult.session.user.userid;

    const { searchParams } = new URL(request.url);
    const episodeid = searchParams.get("episodeid");

    if (!episodeid) {
      return NextResponse.json(
        { success: false, message: "缺少必要参数 (episodeid)" },
        { status: 400 },
      );
    }

    const list = await prisma.vocabulary.findMany({
      where: {
        userid,
        episodeid,
      },
      orderBy: [{ timestamp: "asc" }, { addedDate: "asc" }],
      select: {
        vocabularyid: true,
        word: true,
        definition: true,
        translation: true,
        contextSentence: true,
        timestamp: true,
        speakUrl: true,
      },
    });

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("Fetch vocabulary list error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
