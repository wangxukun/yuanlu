import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { mergeSubtitles } from "@/lib/data";
import { generateSignatureUrl } from "@/lib/oss";
import { parseTimeStr } from "@/lib/tools";
import { Episode } from "@/core/episode/episode.entity";
import { Subtitle, SpeechPracticeRecord } from "@/lib/types";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing episode id" }, { status: 400 });
  }

  const session = await auth();

  // 1. 验证用户登录
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. 获取剧集和历史记录
    const [episode, historyRecords] = await Promise.all([
      prisma.episode.findUnique({
        where: { episodeid: id },
        include: { podcast: true },
      }),
      prisma.speech_recognition.findMany({
        where: {
          episodeid: id,
          userid: session.user.userid,
        },
        orderBy: {
          recognitionDate: "asc",
        },
      }),
    ]);

    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // 拦截：如果是独家剧集，仅限高级会员或管理员访问口语练习
    if (episode.isExclusive) {
      if (session.user.role !== "PREMIUM" && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Premium membership required" },
          { status: 403 },
        );
      }
    }

    // 生成 OSS 签名 URL
    let coverUrl = "";
    let subtitleEnUrl = "";
    let subtitleZhUrl = "";
    let audioUrl = "";

    coverUrl = await generateSignatureUrl(
      episode.coverFileName || "",
      3600 * 3,
    ).catch(() => episode.coverUrl || "");

    if (episode.subtitleEnFileName) {
      subtitleEnUrl = await generateSignatureUrl(
        episode.subtitleEnFileName,
        3600 * 3,
      ).catch(() => episode.subtitleEnUrl || "");
    }

    if (episode.subtitleZhFileName) {
      subtitleZhUrl = await generateSignatureUrl(
        episode.subtitleZhFileName,
        3600 * 3,
      ).catch(() => episode.subtitleZhUrl || "");
    }

    if (episode.audioFileName) {
      audioUrl = await generateSignatureUrl(
        episode.audioFileName,
        3600 * 3,
      ).catch(() => episode.audioUrl || "");
    }

    const voiceEpisode = {
      ...episode,
      coverUrl: coverUrl,
      subtitleEnUrl: subtitleEnUrl || "",
      subtitleZhUrl: subtitleZhUrl || "",
    };

    // 3. 获取并解析字幕
    const mergedSubtitles = await mergeSubtitles(
      voiceEpisode as unknown as Episode,
    );
    let subtitles: Subtitle[] = mergedSubtitles.map((item) => ({
      id: item.id,
      textEn: item.textEn,
      textZh: item.textZh,
      startSeconds: parseTimeStr(item.startTime),
      endSeconds: parseTimeStr(item.endTime),
    }));

    // 4. 数据类型适配
    const episodeData: Episode = {
      ...episode,
      id: episode.episodeid,
      episodeid: episode.episodeid,
      author: episode.podcast?.title || "Unknown",
      audioUrl: audioUrl,
      thumbnailUrl: coverUrl,
      tags: [],
      duration: String(episode.duration),
      publishAt: episode.publishAt
        ? episode.publishAt.toISOString()
        : new Date().toISOString(),
    } as unknown as Episode;

    // 5. 转换历史记录类型
    const formattedRecords: SpeechPracticeRecord[] = historyRecords.map(
      (record) => ({
        recognitionid: Number(record.recognitionid),
        userid: record.userid || "",
        episodeid: record.episodeid || "",
        speechText: record.speechText || "",
        accuracyScore: record.accuracyScore || 0,
        targetText: record.targetText || "",
        targetStartTime: record.targetStartTime || 0,
        recognitionDate: record.recognitionDate
          ? record.recognitionDate.toISOString()
          : new Date().toISOString(),
      }),
    );

    // 6. 处理非会员的试用模式 (非独享 + 普通用户)
    let isTrialMode = false;
    const isPremiumOrAdmin =
      session.user.role === "PREMIUM" || session.user.role === "ADMIN";

    if (!episode.isExclusive && !isPremiumOrAdmin) {
      isTrialMode = true;
      // 随机选取 5 组练习卡片，并按时间线顺序排列
      if (subtitles.length > 5) {
        const shuffled = [...subtitles].sort(() => 0.5 - Math.random());
        subtitles = shuffled
          .slice(0, 5)
          .sort((a, b) => a.startSeconds - b.startSeconds);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        episode: episodeData,
        subtitles,
        previousRecords: formattedRecords,
        isTrialMode,
      },
    });
  } catch (error) {
    console.error("[GET /api/speech/practice-data]", error);
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 },
    );
  }
}
