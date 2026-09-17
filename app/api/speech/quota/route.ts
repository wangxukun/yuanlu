// app/api/speech/quota/route.ts
// [P3-b] 评测配额预检端点：复习练习页据此置锁评分按钮（避免半路触墙）。
// GET /api/speech/quota?scenario=learn|review（默认 learn）
// 返回 { success, data: { scenario, used, limit, remaining, exhausted, isPremium } }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import {
  getEvaluationQuotaStatus,
  normalizeScenario,
} from "@/core/speech/speech-evaluate.service";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  const scenario = normalizeScenario(
    new URL(request.url).searchParams.get("scenario"),
  );
  const status = await getEvaluationQuotaStatus(
    authResult.session.user,
    scenario,
  );

  return NextResponse.json({ success: true, data: status });
}
