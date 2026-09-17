/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isPremiumUser } from "@/core/auth/guard";

/**
 * GET /api/speech/diagnostic —— [P3-e] AI 发音诊断报告（PRO 专属，激活休眠墙）。
 *
 * 返回：
 * - phonemes：薄弱音素 Top10（phonemeStats 全量均分升序；服务端与前端共用同一映射）
 * - trend：近 6 个月评测聚合（月均 overall + 次数）——量级控制：按 userid 过滤、
 *   仅 select 聚合所需字段，单用户行数有限（免费 20/月 + 历史），无全表扫风险
 *
 * 非会员 403（休眠墙保留）：前端 DiagnosticReportCard 弹窗承接
 * （source `diagnostic_report`，openPremiumModal 内置埋点——验收红线）。
 */
export async function GET() {
  // requireAuth：Web Cookie 与移动端 Bearer 双口径（与 errors/quota 一致）
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const session = authResult.session;

  if (!(await isPremiumUser(session.user))) {
    return NextResponse.json(
      { error: "Premium membership required" },
      { status: 403 },
    );
  }

  try {
    const userid = session.user.userid!;

    const [userProfile, recentEvals] = await Promise.all([
      prisma.user_profile.findUnique({
        where: { userid },
        select: { phonemeStats: true },
      }),
      prisma.speech_recognition.findMany({
        where: {
          userid,
          recognitionDate: { gte: sixMonthsAgo() },
          overallScore: { not: null },
        },
        select: { overallScore: true, recognitionDate: true },
      }),
    ]);

    // 薄弱音素 Top10（均分升序 = 最弱在前）
    const stats: any = userProfile?.phonemeStats || {};
    const phonemes = Object.keys(stats)
      .map((phoneme) => {
        const data = stats[phoneme];
        const avgScore = data.count > 0 ? data.totalScore / data.count : 0;
        return {
          phoneme,
          avgScore: Math.round(avgScore),
          count: data.count,
          lowScoreCount: data.lowScoreCount,
        };
      })
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 10);

    // 近 6 个月月度聚合（进步曲线月报数据源）
    const monthMap = new Map<string, { total: number; count: number }>();
    for (const ev of recentEvals) {
      if (!ev.recognitionDate) continue;
      const d = ev.recognitionDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = monthMap.get(key) ?? { total: 0, count: 0 };
      m.total += ev.overallScore ?? 0;
      m.count += 1;
      monthMap.set(key, m);
    }
    const trend = Array.from(monthMap, ([month, m]) => ({
      month,
      avgScore: Math.round(m.total / m.count),
      count: m.count,
    })).sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({ success: true, data: { phonemes, trend } });
  } catch (error) {
    console.error("Diagnostic API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch diagnostic" },
      { status: 500 },
    );
  }
}

function sixMonthsAgo(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 5, 1);
}
