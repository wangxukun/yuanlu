/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { generateSignatureUrl } from "@/lib/oss";
import { mergeSubtitles } from "@/lib/data";
import { isPremiumUser } from "@/core/auth/guard";
import { Episode } from "@/core/episode/episode.entity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 弱项本为 PRO 会员功能，与 /library/pronunciation 页面的锁定态一致
  if (!(await isPremiumUser(session.user))) {
    return NextResponse.json(
      { error: "Premium membership required" },
      { status: 403 },
    );
  }

  try {
    // 弱项本分数线（用户可在语音评测设置中调整，默认 80）
    const profile = await prisma.user_profile.findUnique({
      where: { userid: session.user.userid },
      select: { weakScoreThreshold: true },
    });
    const weakThreshold = profile?.weakScoreThreshold ?? 80;

    // Step A: Find sentences that have a weak attempt (score < weakThreshold)
    const potentialWeakRecords = await prisma.speech_recognition.findMany({
      where: {
        userid: session.user.userid,
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
              audioFileName: true,
              isExclusive: true,
              // 字幕数据：用于为复习卡片补齐 textCn / 词级时间戳 / 精确结束时间
              subtitleEnUrl: true,
              subtitleEnFileName: true,
              subtitleZhUrl: true,
              subtitleZhFileName: true,
              subtitleBilingualUrl: true,
              subtitleBilingualFileName: true,
            },
          },
        },
      });

      // Step C: Only keep them if the latest attempt is STILL < weakThreshold
      uniqueRecords = latestAttempts.filter(
        (r) => r.overallScore !== null && r.overallScore < weakThreshold,
      );
    }

    // Generate signed URLs for covers and audio
    const episodeCoverCache = new Map<string, string>();
    const episodeAudioCache = new Map<string, string>();
    // 独家剧集仅会员/管理员可播放音频（与 practice-data / audio-proxy 鉴权一致，
    // 统一走 isPremiumUser：role 或有效订阅任一命中）
    const canPlayExclusive = await isPremiumUser(session.user);
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

        // 签名音频直链：独家剧集对非会员留空（禁止播放），保持与原 audio-proxy 鉴权一致
        if (!episodeAudioCache.has(episodeId)) {
          let signedAudio = "";
          if (record.episode.isExclusive && !canPlayExclusive) {
            signedAudio = "";
          } else if (record.episode.audioFileName) {
            signedAudio = await generateSignatureUrl(
              record.episode.audioFileName,
              3600 * 3,
            ).catch(() => record.episode.audioUrl || "");
          } else {
            signedAudio = record.episode.audioUrl || "";
          }
          episodeAudioCache.set(episodeId, signedAudio);
        }
        record.episode.audioUrl = episodeAudioCache.get(episodeId) || "";
      }
    }

    // 为每条 record 补齐字幕数据(textCn / 词级时间戳 words / 精确结束秒)
    // 按剧集分组，每剧集只 mergeSubtitles 一次（避免重复 fetch+decode）
    const episodeSubtitleCache = new Map<
      string,
      {
        textEn: string;
        textCn: string;
        start: number;
        end: number;
        words?: any;
      }[]
    >();

    for (const record of uniqueRecords) {
      try {
        const episodeId = record.episodeid as string;
        const ep = record.episode;
        if (!episodeId || !ep) continue;

        // 合并字幕（每剧集只做一次）
        let subtitles = episodeSubtitleCache.get(episodeId);
        if (subtitles === undefined) {
          // 生成签名 URL（与 practice-data 同款），mergeSubtitles 依赖这些字段
          const subtitleEnUrl = ep.subtitleEnFileName
            ? await generateSignatureUrl(ep.subtitleEnFileName, 3600 * 3).catch(
                () => ep.subtitleEnUrl || "",
              )
            : ep.subtitleEnUrl || "";
          const subtitleZhUrl = ep.subtitleZhFileName
            ? await generateSignatureUrl(ep.subtitleZhFileName, 3600 * 3).catch(
                () => ep.subtitleZhUrl || "",
              )
            : ep.subtitleZhUrl || "";
          const subtitleBilingualUrl = ep.subtitleBilingualFileName
            ? await generateSignatureUrl(
                ep.subtitleBilingualFileName,
                3600 * 3,
              ).catch(() => ep.subtitleBilingualUrl || "")
            : ep.subtitleBilingualUrl || "";

          const merged = await mergeSubtitles({
            ...ep,
            subtitleEnUrl,
            subtitleZhUrl,
            subtitleBilingualUrl,
          } as unknown as Episode);
          subtitles = merged.map((item) => ({
            textEn: item.textEn,
            textCn: item.textCn,
            start: item.start,
            end: item.end,
            words: (item as any).words,
          }));
          episodeSubtitleCache.set(episodeId, subtitles);
        }

        // 匹配对应字幕项：文本相等优先，时间兜底
        const targetText = (record.targetText || "").trim();
        const targetStart = record.targetStartTime ?? 0;
        const matched =
          subtitles.find((s) => s.textEn.trim() === targetText) ??
          subtitles.find((s) => Math.abs(s.start - targetStart) < 0.5);

        record.subtitleTextCn = matched?.textCn ?? "";
        record.subtitleWords = matched?.words;
        record.subtitleEnd = matched?.end;
      } catch {
        // 单条字幕匹配失败不应阻断整个请求；优雅降级
        record.subtitleTextCn = "";
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
