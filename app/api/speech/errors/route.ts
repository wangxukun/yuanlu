/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { generateSignatureUrl } from "@/lib/oss";
import { mergeSubtitles } from "@/lib/data";
import { requireAuth, isPremiumUser } from "@/core/auth/guard";
import { Episode } from "@/core/episode/episode.entity";
import { getWeakSentences } from "@/core/speech/weak-sentences.service";

export async function GET() {
  // requireAuth：Web Cookie 与移动端 Bearer 双口径（与 evaluate 一致）
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const session = authResult.session;

  // 弱项本为 PRO 会员功能，与 /library/pronunciation 页面的锁定态一致
  if (!(await isPremiumUser(session.user))) {
    return NextResponse.json(
      { error: "Premium membership required" },
      { status: 403 },
    );
  }

  try {
    // [P2-4] Step A/B/C + 已攻克标记过滤统一走共享 service（三处同源）
    const { records: uniqueRecords, threshold: weakThreshold } =
      await getWeakSentences(session.user.userid, {
        episodeSelect: {
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
      });

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

    // weakThreshold 一并回传：闯关页"已达标"判定与弱项列表生成共用同一口径（修 N1/N2）
    return NextResponse.json({
      success: true,
      data: uniqueRecords,
      weakThreshold,
    });
  } catch (error) {
    console.error("Speech Errors API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch error sentences" },
      { status: 500 },
    );
  }
}
