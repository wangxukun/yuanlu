"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * 字幕对齐的剧集原声播放 hook——与语音评测的原声播放
 * （useSpeechEvaluation.playReferenceAudio）同款实现：
 * 1. 拉取剧集规范化字幕（含词级时间戳）与 OSS 签名直链（不走 audio-proxy，
 *    代理流式 body 与 206 Range seek 冲突；CBR M4A 直连 seek 落点精确）
 * 2. 定位目标字幕句：上下文句文本匹配优先（归一化后双向包含），
 *    vocabulary.timestamp 与字幕时间轴普遍不一致、仅作兜底
 * 3. 播放窗口：词级 words[0].start → words[last].end，句级时间兜底
 *
 * 字幕与音频直链按剧集缓存；同一 key 播放中再次调用视为停止。
 */
export interface OriginalSubtitle {
  /** 字段名与 /api/episode/subtitles 的原始返回（mergeSubtitles 输出）一致：
   * start/end（秒）。注意不是 practice-data 映射后的 startSeconds/endSeconds。 */
  start: number;
  end?: number;
  textEn: string;
  words?: { word: string; start: number; end: number }[];
}

export interface PlayOriginalParams {
  /** 播放项唯一标识（如 `${episodeid}:${word}`），用于播放状态高亮与切换 */
  key: string;
  episodeid: string;
  /** 目标时间戳（秒），用于定位字幕句 */
  timestamp?: number | null;
  /** 目标句文本，时间戳定位失败时兜底 */
  contextSentence?: string | null;
}

interface OriginalSubtitleSource {
  audioUrl: string | null;
  subtitles: OriginalSubtitle[];
}

/** 文本归一化：忽略大小写、标点与多余空格——收藏的上下文句与字幕文本
 *  常有标点/引号差异，裸字符串匹配会漏（实测 169 词漏 4 个） */
const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .replace(/[.,!?;:"'’“”()\-—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function useOriginalAudio(options?: {
  /** 播放前的回调（如停掉 TTS，避免双声重叠） */
  onBeforePlay?: () => void;
}) {
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 回调存 ref，避免调用方内联函数导致 play 每次渲染重建
  const onBeforePlayRef = useRef(options?.onBeforePlay);
  onBeforePlayRef.current = options?.onBeforePlay;
  // 剧集字幕与签名音频直链缓存（模块级：同会话多组件实例共享）
  const sourceCache = useRef<Map<string, OriginalSubtitleSource | "loading">>(
    new Map(),
  );

  /** 停止播放。先摘除事件处理器再暂停：清空资源或停止动作本身可能触发
   *  error 事件，残留的 onerror 会导致正常播完后误弹"原声加载失败"。 */
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onerror = null;
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      audio.pause();
      audioRef.current = null;
    }
    setPlayingKey(null);
  }, []);

  // 卸载时停止
  useEffect(() => {
    return () => stop();
  }, [stop]);

  const play = useCallback(
    async ({
      key,
      episodeid,
      timestamp,
      contextSentence,
    }: PlayOriginalParams) => {
      if (playingKey === key) {
        stop();
        return;
      }
      stop();
      options?.onBeforePlay?.();
      try {
        setLoadingKey(key);

        // 1. 字幕 + 签名音频直链（按剧集缓存，失败自动重试不自锁）
        let source = sourceCache.current.get(episodeid);
        if (!source || source === "loading") {
          sourceCache.current.set(episodeid, "loading");
          const res = await fetch(`/api/episode/subtitles?id=${episodeid}`);
          const json = await res.json();
          if (!res.ok || !json.success) throw new Error("fetch failed");
          source = {
            audioUrl: json.audioUrl ?? null,
            subtitles: (json.data ?? []) as OriginalSubtitle[],
          };
          sourceCache.current.set(episodeid, source);
        }

        if (!source.audioUrl) {
          toast.error("暂时无法播放原声");
          return;
        }

        // 2. 定位目标字幕句：文本匹配优先，时间戳区间兜底。
        // 实测（169 词）文本匹配命中率 98%+；而 vocabulary.timestamp 与当前
        // 字幕时间轴普遍不一致（仅 10% 能对上句），只能作为无上下文句时的兜底。
        let target: OriginalSubtitle | undefined;
        if (contextSentence) {
          const norm = normalizeText(contextSentence);
          target = source.subtitles.find(
            (s) =>
              norm.includes(normalizeText(s.textEn)) ||
              normalizeText(s.textEn).includes(norm),
          );
        }
        if (!target) {
          const ts = timestamp ?? 0;
          target = source.subtitles.find(
            (s) => ts >= s.start && (s.end === undefined || ts <= s.end),
          );
        }
        if (!target) {
          toast.error("未找到该句的原声位置");
          return;
        }

        // 3. 对齐播放窗口：词级起止优先，句级兜底（与 playReferenceAudio 一致）
        const words = target.words ?? [];
        const targetStart = words.length > 0 ? words[0].start : target.start;
        const endTime =
          words.length > 0
            ? words[words.length - 1].end
            : (target.end ?? targetStart + 3);

        // 防御：个别字幕条目可能缺时间字段，非有限值直接按未定位处理，
        // 避免 currentTime 赋 NaN 抛 TypeError
        if (!Number.isFinite(targetStart) || !Number.isFinite(endTime)) {
          toast.error("未找到该句的原声位置");
          return;
        }

        const audio = new Audio();
        audio.preload = "auto";
        audioRef.current = audio;
        if (audio.getAttribute("src") !== source.audioUrl) {
          audio.setAttribute("src", source.audioUrl);
          audio.load();
        }

        const seekAndPlay = () => {
          audio.currentTime = Math.max(0, targetStart);
          audio
            .play()
            .then(() => setPlayingKey(key))
            .catch(() => {
              toast.error("原声播放失败");
              stop();
            });
        };
        if (audio.readyState >= 1) {
          seekAndPlay();
        } else {
          audio.onloadedmetadata = () => seekAndPlay();
        }
        // 到窗口终点自动停止
        audio.ontimeupdate = () => {
          if (audio.currentTime >= endTime) stop();
        };
        audio.onended = () => stop();
        audio.onerror = () => {
          toast.error("原声加载失败");
          stop();
        };
      } catch {
        toast.error("原声信息加载失败");
        stop();
      } finally {
        setLoadingKey(null);
      }
    },
    [playingKey, stop, options],
  );

  return { play, stop, playingKey, loadingKey };
}
