import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/core/auth/guard";

export async function POST(req: Request) {
  try {
    // Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;
    const userid = authResult.session.user.userid;

    const { vocabularyid } = await req.json();

    if (!vocabularyid) {
      return NextResponse.json({ message: "缺少必要参数" }, { status: 400 });
    }

    // 验证归属
    const vocab = await prisma.vocabulary.findUnique({
      where: { vocabularyid: Number(vocabularyid) },
    });

    if (!vocab) {
      return NextResponse.json(
        { message: "未找到该生词记录" },
        { status: 404 },
      );
    }

    if (vocab.userid !== userid) {
      return NextResponse.json({ message: "无权删除该记录" }, { status: 403 });
    }

    await prisma.vocabulary.delete({
      where: { vocabularyid: Number(vocabularyid) },
    });

    return NextResponse.json({
      success: true,
      message: "生词已彻底删除",
    });
  } catch (error) {
    console.error("Delete vocabulary error:", error);
    return NextResponse.json(
      { message: "内部服务器错误", error: String(error) },
      { status: 500 },
    );
  }
}
