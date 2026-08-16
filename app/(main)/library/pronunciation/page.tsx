/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import { isPremiumUser } from "@/core/auth/guard";
import { recordConversionEvent } from "@/lib/track";
import { speechProfileService } from "@/core/speech-profile/speech-profile.service";
import { redirect } from "next/navigation";
import PronunciationNotebook from "./PronunciationNotebook";
import { SpeechProfileCard } from "./components/SpeechProfileCard";

export const metadata = {
  title: "发音弱项本 | 远路播客",
};

/** 非会员可查看的弱项句子数量（完整列表与针对性练习为会员功能） */
const FREE_VISIBLE_ERRORS = 3;

export default async function PronunciationPage() {
  const session = await auth();

  if (!session?.user?.userid) {
    redirect("/");
  }

  const isPremium = await isPremiumUser(session.user);
  const userId = session.user.userid;

  // 1. Fetch Diagnostic Stats
  const userProfile: any = await prisma.user_profile.findUnique({
    where: { userid: userId },
  });
  // 弱项本分数线（用户可在语音评测设置中调整，默认 80）
  const weakThreshold = userProfile?.weakScoreThreshold ?? 80;
  const statsData: any = userProfile?.phonemeStats || {};
  const formattedStats = Object.keys(statsData).map((phoneme) => {
    const data = statsData[phoneme];
    const avgScore = data.count > 0 ? data.totalScore / data.count : 0;
    return {
      phoneme,
      avgScore: Math.round(avgScore),
      count: data.count,
      lowScoreCount: data.lowScoreCount,
    };
  });
  formattedStats.sort((a, b) => a.avgScore - b.avgScore);

  // 2. Fetch Errors (Weak Sentences)
  // Step A: Find sentences that have a weak attempt (score < weakThreshold)
  const potentialWeakRecords = await prisma.speech_recognition.findMany({
    where: {
      userid: userId,
      overallScore: { lt: weakThreshold },
    },
    orderBy: { recognitionDate: "desc" },
    distinct: ["targetText"],
    take: 100,
  });

  const potentialTexts = potentialWeakRecords
    .map((r) => r.targetText)
    .filter(Boolean) as string[];

  // Step B: Get the absolute latest attempt for these sentences
  let uniqueRecords: any[] = [];
  if (potentialTexts.length > 0) {
    const latestAttempts = await prisma.speech_recognition.findMany({
      where: {
        userid: userId,
        targetText: { in: potentialTexts },
      },
      orderBy: { recognitionDate: "desc" },
      distinct: ["targetText"],
      include: {
        episode: {
          select: {
            title: true,
            coverUrl: true,
            coverFileName: true,
            audioUrl: true,
          },
        },
      },
    });

    // Step C: Only keep them if the latest attempt is STILL < weakThreshold
    uniqueRecords = latestAttempts.filter(
      (r) => r.overallScore !== null && r.overallScore < weakThreshold,
    );
  }

  const episodeCoverCache = new Map<string, string>();
  for (const record of uniqueRecords) {
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

  // 试用模式：非会员可看诊断统计与前 3 条弱项，完整列表与练习为会员功能。
  // 音素数据由免费评测额度沉淀，让用户先看到"数据已积累"的价值感。
  const totalErrors = uniqueRecords.length;
  const visibleErrors = isPremium
    ? uniqueRecords
    : uniqueRecords.slice(0, FREE_VISIBLE_ERRORS);

  // 非会员存在被锁定的弱项句子时记录触墙事件（转化漏斗分析）
  if (!isPremium && totalErrors > FREE_VISIBLE_ERRORS) {
    await recordConversionEvent({
      eventType: "TRIAL_REACHED",
      source: "pronunciation_trial",
      userid: userId,
      metadata: { totalErrors },
    });
  }

  // 发音能力画像（对所有用户免费展示，数据来自免费评测额度）
  const speechProfile = await speechProfileService.getSpeechProfile(userId);
  const speechRadar = speechProfileService.toRadarData(speechProfile);

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen pb-20 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 xl:py-8 space-y-6 xl:space-y-8 font-sans">
        <SpeechProfileCard profile={speechProfile} radar={speechRadar} />
        <PronunciationNotebook
          stats={formattedStats}
          errors={visibleErrors}
          isPremium={isPremium}
          totalErrors={totalErrors}
        />
      </div>
    </div>
  );
}
