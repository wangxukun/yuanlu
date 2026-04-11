import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { proofreadService } from "@/core/proofread/proofread.service";

/**
 * POST /api/proofread/review
 * Admin reviews (approve/reject) a proofreading request
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
    const { id, action } = body;

    if (!id || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "参数不完整" },
        { status: 400 },
      );
    }

    let result;
    if (action === "approve") {
      result = await proofreadService.approveProofread(id, session.user.userid);
    } else {
      result = await proofreadService.rejectProofread(id, session.user.userid);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/proofread/review]", error);
    const message = error instanceof Error ? error.message : "审核失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
