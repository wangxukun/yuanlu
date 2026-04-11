import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { proofreadService } from "@/core/proofread/proofread.service";

/**
 * GET /api/proofread/pending
 * Admin gets all pending proofreading requests
 */
export async function GET() {
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

    const list = await proofreadService.getPendingList();
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("[GET /api/proofread/pending]", error);
    return NextResponse.json(
      { success: false, error: "获取失败" },
      { status: 500 },
    );
  }
}
