/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { generateSignatureUrl } from "@/lib/oss";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step A: Find sentences that have a weak attempt (score < 80)
    const potentialWeakRecords = await prisma.speech_recognition.findMany({
      where: {
        userid: session.user.userid,
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
          userid: session.user.userid,
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

    // Generate signed URLs for covers
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

    return NextResponse.json({ success: true, data: uniqueRecords });
  } catch (error) {
    console.error("Speech Errors API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch error sentences" },
      { status: 500 },
    );
  }
}
