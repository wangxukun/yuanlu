import React from "react";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import VoiceEvaluationClient from "@/components/voice/VoiceEvaluationClient";
import {
  MergedSubtitleItem,
  SpeechPracticeRecord,
  Subtitle,
} from "@/lib/types";
import { Episode } from "@/core/episode/episode.entity";
import { Prisma } from "@prisma/client";
import { mergeSubtitles } from "@/lib/data";
import { parseTimeStr } from "@/lib/tools";
import { generateSignatureUrl } from "@/lib/oss";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PracticePage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  // 1. 验证用户登录
  if (!session?.user?.userid) {
    redirect(`/auth/signin?callbackUrl=/episode/${id}/practice`);
  }

  // 2. 并行获取：单集详情 + 用户之前的练习记录
  const [episode, historyRecords] = await Promise.all([
    prisma.episode.findUnique({
      where: { episodeid: id },
      include: {
        podcast: true,
      },
    }),
    prisma.speech_recognition.findMany({
      where: {
        episodeid: id,
        userid: session.user.userid,
      },
      orderBy: {
        recognitionDate: Prisma.SortOrder.asc,
      },
    }),
  ]);

  if (!episode) {
    notFound();
  }

  let coverUrl = "";
  let subtitleEnUrl = "";
  let subtitleZhUrl = "";
  // 获取封面图片
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

  const voiceEpisode = {
    ...episode,
    coverUrl: coverUrl,
    subtitleEnUrl: subtitleEnUrl || "",
    subtitleZhUrl: subtitleZhUrl || "",
  };

  // 3. 获取并解析字幕
  let subtitles: Subtitle[] = [];
  const mergedSubtitles: MergedSubtitleItem[] = await mergeSubtitles(
    voiceEpisode as unknown as Episode,
  );
  subtitles = mergedSubtitles.map((item) => ({
    id: item.id,
    textEn: item.textEn,
    textZh: item.textZh,
    startSeconds: parseTimeStr(item.startTime),
    endSeconds: parseTimeStr(item.endTime),
  }));

  // 4. 数据类型适配 (Prisma Model -> Frontend Type)
  // 确保 episode 对象符合 Podcast 类型要求 (可能需要根据你的 types.ts 微调)
  const episodeData: Episode = {
    ...episode,
    id: episode.episodeid, // 兼容前端 id
    episodeid: episode.episodeid,
    author: episode.podcast?.title || "Unknown",
    thumbnailUrl: coverUrl,
    tags: [], // 简化处理
    duration: String(episode.duration), // 确保类型匹配
    publishAt: episode.publishAt
      ? episode.publishAt.toISOString()
      : new Date().toISOString(),
  } as unknown as Episode;

  // 5. 转换历史记录类型
  const formattedRecords: SpeechPracticeRecord[] = historyRecords.map(
    (record) => ({
      recognitionid: record.recognitionid,
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

  return (
    <VoiceEvaluationClient
      episode={episodeData}
      subtitles={subtitles}
      previousRecords={formattedRecords}
    />
  );
}
