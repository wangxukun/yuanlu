/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import { redirect } from "next/navigation";
import PronunciationNotebook from "./PronunciationNotebook";

export const metadata = {
  title: "发音弱项本 | 远路播客",
};

export default async function PronunciationPage() {
  const session = await auth();

  if (!session?.user?.userid) {
    redirect("/");
  }

  const userId = session.user.userid;

  // 1. Fetch Diagnostic Stats
  const userProfile = await prisma.user_profile.findUnique({
    where: { userid: userId },
    select: { phonemeStats: true },
  });
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
  // Step A: Find sentences that have a weak attempt (score < 80)
  const potentialWeakRecords = await prisma.speech_recognition.findMany({
    where: {
      userid: userId,
      overallScore: { lt: 80 },
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

    // Step C: Only keep them if the latest attempt is STILL < 80
    uniqueRecords = latestAttempts.filter(
      (r) => r.overallScore !== null && r.overallScore < 80,
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

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen pb-20 transition-colors duration-300">
      <PronunciationNotebook stats={formattedStats} errors={uniqueRecords} />
    </div>
  );
}
