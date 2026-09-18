import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mergeSubtitles } from "@/lib/data";
import { generateSignatureUrl } from "@/lib/oss";
import { requireAuth, canAccessEpisode } from "@/core/auth/guard";
import { Episode } from "@/core/episode/episode.entity";
import { Subtitle, SpeechPracticeRecord } from "@/lib/types";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing episode id" }, { status: 400 });
  }

  // 1. 验证用户登录（requireAuth：Web Cookie 与移动端 Bearer 双口径，与 evaluate 一致）
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const session = authResult.session;

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

    // 拦截：会员专享剧集的口语练习需会员权限（统一入口 canAccessEpisode）
    if (!(await canAccessEpisode(session.user, episode))) {
      return NextResponse.json(
        { error: "Premium membership required" },
        { status: 403 },
      );
    }

    // 生成 OSS 签名 URL
    let coverUrl = "";
    let subtitleEnUrl = "";
    let subtitleZhUrl = "";
    let subtitleBilingualUrl = "";
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

    if (episode.subtitleBilingualFileName) {
      subtitleBilingualUrl = await generateSignatureUrl(
        episode.subtitleBilingualFileName,
        3600 * 3,
      ).catch(() => episode.subtitleBilingualUrl || "");
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
      subtitleBilingualUrl: subtitleBilingualUrl || "",
    };

    // 3. 获取并解析字幕
    const mergedSubtitles = await mergeSubtitles(
      voiceEpisode as unknown as Episode,
    );
    const subtitles: Subtitle[] = mergedSubtitles.map((item) => ({
      id: item.id,
      textEn: item.textEn,
      textCn: item.textCn,
      startSeconds: item.start,
      endSeconds: item.end,
      speaker: "speaker" in item ? item.speaker : undefined,
      words: "words" in item ? item.words : undefined,
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
    const formattedRecords: SpeechPracticeRecord[] = await Promise.all(
      historyRecords.map(async (record) => {
        let signedAudioUrl = record.userAudioUrl ?? undefined;
        if (signedAudioUrl && signedAudioUrl.includes("aliyuncs.com/")) {
          const fileName = decodeURIComponent(
            signedAudioUrl.split("aliyuncs.com/")[1] || "",
          );
          if (fileName) {
            try {
              signedAudioUrl = await generateSignatureUrl(fileName, 3600 * 3);
            } catch (e) {
              console.error(
                "Failed to generate signature for history audio",
                e,
              );
            }
          }
        }

        let signedDetailUrl = record.detailUrl ?? undefined;
        if (signedDetailUrl && signedDetailUrl.includes("aliyuncs.com/")) {
          const fileName = decodeURIComponent(
            signedDetailUrl.split("aliyuncs.com/")[1] || "",
          );
          if (fileName) {
            try {
              signedDetailUrl = await generateSignatureUrl(fileName, 3600 * 3);
            } catch (e) {
              console.error("Failed to generate signature for detail JSON", e);
            }
          }
        }

        return {
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
          fluencyScore: record.fluencyScore ?? undefined,
          integrityScore: record.integrityScore ?? undefined,
          overallScore: record.overallScore ?? undefined,
          speed: record.speed ?? undefined,
          detailUrl: signedDetailUrl ?? undefined,
          userAudioUrl: signedAudioUrl,
          subtitleId: record.subtitleId ?? undefined,
        };
      }),
    );

    // 6. [全局日池统一] 免费用户可完整浏览本集全部句子（原"前 5 句试用切片"
    //    已废止，转化墙收敛到录音评测动作本身——每日 5 次全局跟读配额，
    //    由 speech-evaluate.service 统一执法）。isTrialMode 恒为 false，
    //    字段保留仅为旧客户端（Android 已发版包）响应结构兼容。
    return NextResponse.json({
      success: true,
      data: {
        episode: episodeData,
        subtitles,
        previousRecords: formattedRecords,
        isTrialMode: false,
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
