import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import { requireAuth, isPremiumUser } from "@/core/auth/guard";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing recognition id" },
      { status: 400 },
    );
  }

  // requireAuth：Web Cookie 与移动端 Bearer 双口径（与 evaluate 一致）
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const session = authResult.session;

  // [P3-g] 评测细节（词级/音素级 JSON）为 PRO 专属内容：
  // practice-data 对免费用户已整条剥离 detailUrl（无 UI 入口触发本接口），
  // 此门禁为纵深防御——免费用户持 recognitionid 直调同样拦截。
  if (!(await isPremiumUser(session.user))) {
    return NextResponse.json(
      { success: false, error: "PREMIUM_REQUIRED", code: "PREMIUM_REQUIRED" },
      { status: 403 },
    );
  }

  try {
    const record = await prisma.speech_recognition.findUnique({
      where: { recognitionid: Number(id) },
    });

    if (!record || !record.detailUrl) {
      return NextResponse.json(
        { error: "Record or detail not found" },
        { status: 404 },
      );
    }

    if (
      record.userid !== session.user.userid &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let signedDetailUrl = record.detailUrl;
    if (signedDetailUrl.includes("aliyuncs.com/")) {
      const fileName = decodeURIComponent(
        signedDetailUrl.split("aliyuncs.com/")[1] || "",
      );
      if (fileName) {
        signedDetailUrl = await generateSignatureUrl(fileName, 3600);
      }
    }

    const ossRes = await fetch(signedDetailUrl);
    if (!ossRes.ok) {
      throw new Error(`Failed to fetch OSS: ${ossRes.statusText}`);
    }

    const data = await ossRes.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[GET /api/speech/detail]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
