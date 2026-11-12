import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { getStudioDashboard } from "@/core/stats/studio-dashboard.service";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    const data = await getStudioDashboard(auth.session.user.userid);
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("[studio-dashboard]", error);
    return NextResponse.json(
      { success: false, message: "学习进度暂时无法加载，请重试" },
      { status: 500 },
    );
  }
}
