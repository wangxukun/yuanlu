/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import { requireAuth, isPremiumUser } from "@/core/auth/guard";
import { speechProfileService } from "@/core/speech-profile/speech-profile.service";
import { getWeakSentences } from "@/core/speech/weak-sentences.service";

/**
 * GET /api/speech/notebook
 *
 * 发音弱项本主页聚合接口（Android 专用，Web 走 SSR）：
 * 复刻 app/(main)/library/pronunciation/page.tsx 的服务端数据组装——
 * - 发音能力画像（五维雷达 + CEFR，所有用户免费）
 * - 薄弱音素统计（user_profile.phonemeStats，所有用户免费）
 * - 弱项句子列表（会员全量 / 非会员前 3 条试用切片 + totalErrors + isTrialMode，
 *   [P3-c] 切片执行收编 weak-sentences service 按 isPremium 统一）
 */
export async function GET() {
  // requireAuth：Web Cookie 与移动端 Bearer 双口径（与 errors 一致）
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const session = authResult.session;
  const userId = session.user.userid;

  try {
    const isPremium = await isPremiumUser(session.user);

    // 1. 发音能力画像（对所有用户免费展示，数据来自免费评测额度）
    const profile = await speechProfileService.getSpeechProfile(userId);

    // 2. 薄弱音素统计（按均分升序，最弱在前）
    const userProfile: any = await prisma.user_profile.findUnique({
      where: { userid: userId },
      select: { phonemeStats: true, weakScoreThreshold: true },
    });
    const weakThreshold = userProfile?.weakScoreThreshold ?? 80;
    const statsData: any = userProfile?.phonemeStats || {};
    const phonemeStats = Object.keys(statsData)
      .map((phoneme) => {
        const data = statsData[phoneme];
        const avgScore = data.count > 0 ? data.totalScore / data.count : 0;
        return {
          phoneme,
          avgScore: Math.round(avgScore),
          count: data.count,
          lowScoreCount: data.lowScoreCount,
        };
      })
      .sort((a, b) => a.avgScore - b.avgScore);

    // 3. 弱项句子（[P2-4] Step A/B/C + 已攻克标记过滤统一走共享 service，
    //    与 errors / pronunciation 页同源；threshold 复用本次已查的 profile；
    //    [P3-c] 试用切片也收编 service：isPremium=false 自动截前 3 条）
    const {
      records: errors,
      totalErrors,
      isTrialMode,
    } = await getWeakSentences(userId, {
      isPremium,
      threshold: weakThreshold,
      episodeSelect: {
        title: true,
        coverUrl: true,
        coverFileName: true,
      },
    });

    // 封面签名（列表页仅需封面；audioUrl/字幕补齐由 errors 接口负责）
    const episodeCoverCache = new Map<string, string>();
    for (const record of errors) {
      if (record.episode) {
        const episodeId = record.episodeid;
        if (!episodeCoverCache.has(episodeId)) {
          let signedCover = "";
          if (record.episode.coverFileName) {
            signedCover = await generateSignatureUrl(
              record.episode.coverFileName,
              3600 * 3,
            ).catch(() => record.episode.coverUrl || "");
          } else {
            signedCover = record.episode.coverUrl || "";
          }
          episodeCoverCache.set(episodeId, signedCover);
        }
        record.episode.coverUrl = episodeCoverCache.get(episodeId) || "";
      }
    }

    // [P3-a] 试用切片常量 FREE_VISIBLE_ERRORS 已收编 lib/quota.ts，
    // [P3-c] 切片执行再收编 weak-sentences service（此处仅透传结果）
    return NextResponse.json({
      success: true,
      data: {
        isPremium,
        weakThreshold,
        profile,
        phonemeStats,
        totalErrors,
        isTrialMode,
        errors,
      },
    });
  } catch (error) {
    console.error("[GET /api/speech/notebook]", error);
    return NextResponse.json(
      { error: "Failed to fetch pronunciation notebook" },
      { status: 500 },
    );
  }
}
