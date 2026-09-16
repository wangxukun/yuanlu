import { NextResponse } from "next/server";
import { statsService } from "@/core/stats/stats.service";

/**
 * [P2-6] 社会认同营销数据（公开只读，无 PII）：
 * 供 PremiumModal 客户端渲染"已有 N 位学习者加入 PRO"钩子。
 * 订阅页走 SSR 直连 statsService，不经过本接口。
 * revalidate=600：ISR 缓存 10 分钟，避免高频弹窗打穿统计查询。
 */
export const revalidate = 600;

export async function GET() {
  try {
    const stats = await statsService.getSocialProofStats();
    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    console.error("[GET /api/stats/social-proof]", error);
    // 营销钩子缺数据时前端不渲染，返回空统计而非 500（宁缺毋假）
    return NextResponse.json(
      { success: false, memberCount: 0, totalLearningHours: 0 },
      { status: 200 },
    );
  }
}
