import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { proofreadService } from "@/core/proofread/proofread.service";

/**
 * POST /api/proofread/submit
 * Regular user submits a proofreading request for admin review
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

    const result = await proofreadService.submitProofread({
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
    console.error("[POST /api/proofread/submit]", error);
    return NextResponse.json(
      { success: false, error: "提交失败" },
      { status: 500 },
    );
  }
}
