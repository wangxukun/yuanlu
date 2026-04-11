import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { proofreadService } from "@/core/proofread/proofread.service";

/**
 * POST /api/proofread/direct-update
 * Admin directly updates subtitle without review process
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.userid) {
      return NextResponse.json(
        { success: false, error: "请先登录" },
        { status: 401 },
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      episodeid,
      subtitleIndex,
      originalTextEn,
      originalTextZh,
      modifiedTextEn,
      modifiedTextZh,
    } = body;

    if (!episodeid || subtitleIndex === undefined) {
      return NextResponse.json(
        { success: false, error: "参数不完整" },
        { status: 400 },
      );
    }

    const result = await proofreadService.directUpdate({
      episodeid,
      subtitleIndex,
      originalTextEn,
      originalTextZh,
      modifiedTextEn,
      modifiedTextZh,
      submitterId: session.user.userid,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/proofread/direct-update]", error);
    return NextResponse.json(
      { success: false, error: "更新失败" },
      { status: 500 },
    );
  }
}
