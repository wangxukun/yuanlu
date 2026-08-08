/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { evaluateSpeech } from "@/lib/actions/speech";
import { SpeechPracticeRecord, Subtitle } from "@/lib/types";

// --- 类型定义 ---
export interface YoudaoWord {
  word: string;
  pronunciation: number;
  start: number;
  end: number;
}

export interface YoudaoResult {
  pronunciation: number; // 发音准确度
  fluency: number; // 流利度
  integrity: number; // 完整度
  speed: number; // 语速
  overall: number; // 综合评分
  words: YoudaoWord[];
  errorCode: string;
}

export interface DetailedPracticeRecord extends SpeechPracticeRecord {
  fluencyScore?: number;
  integrityScore?: number;
  overallScore?: number;
  speed?: number;
  words?: {
    word: string;
    score: number;
    start?: number;
    end?: number;
    phonemes?: any[];
  }[];
  userAudioUrl?: string; // 本地录音回放地址
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// ─── 模块级：整集音频字节流跨卡片共享缓存 ──────────────────────────────────
// 同一 episodeId 对应同一份音频文件。原 useSpeechEvaluation 把缓存放在 hook 实例
// 的 ref 里，导致每个 SpeechEvaluationCard 各自下载+解码整集音频（20-60MB），
// 首次点击原声要等 20s+。提升到模块级后，同集只下载一次，所有卡片共享。
//
// 关键：这里只缓存下载好的 **ArrayBuffer（字节流）**，不在此处 decodeAudioData。
// 因为 decodeAudioData 需要一个 AudioContext，而 AudioContext 在非用户手势里
// 创建会进入 suspended 状态（浏览器自动播放策略）。若预加载时创建了它，会污染
// playbackContextRef，导致首次点击时 currentTime 不前进、扫光高亮失效。
// 所以：预加载只做 fetch（省掉 20s 网络），decode + 创建 AudioContext 仍在
// 用户手势（点击 → playReferenceAudio）内完成，确保 context 进入 running 状态。
// key 为 fetchUrl（同源代理 URL 或直连 URL），与剧集一一对应。
const episodeBufferCache = new Map<
  string,
  { bytes: ArrayBuffer | null; promise: Promise<ArrayBuffer> | null }
>();

// ----------------------------------------------------------------------
// 工具函数：将 Float32Array PCM 数据编码为 WAV Blob (16bit, 16000Hz, Mono)
// ----------------------------------------------------------------------
export function encodeWAV(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(view, 0, "RIFF");
  // file length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, "WAVE");
  // format chunk identifier
  writeString(view, 12, "fmt ");
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count (1)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * blockAlign)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, "data");
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // 写 PCM 数据
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

export function useSpeechEvaluation({
  subtitle,
  audioUrl,
  episodeId,
  previousResult,
  onEvaluate,
  currentPlayingId,
  onPlayStart,
}: {
  subtitle: Subtitle;
  audioUrl: string;
  episodeId?: string;
  previousResult?: SpeechPracticeRecord;
  onEvaluate: (
    subtitleId: number,
    recordedText: string,
    score: number,
    fullRecord?: any,
    rawDetails?: any,
    audioBase64?: string,
  ) => void;
  currentPlayingId: number | null;
  onPlayStart: (id: number) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DetailedPracticeRecord | undefined>(
    previousResult ? { ...previousResult } : undefined,
  );

  // Track whether we have a fresh local result (from current recording session)
  // to prevent the previousResult sync effect from overwriting detailed scores.
  const hasLocalResultRef = useRef(false);

  const [refAudioProgress, setRefAudioProgress] = useState(0);
  const [isUserAudioPlaying, setIsUserAudioPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioDataRef = useRef<Float32Array[]>([]);

  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);
  const userAudioInstanceRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioInstanceRef = useRef<HTMLAudioElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const userAudioUrlRef = useRef<string | undefined>(undefined);

  // ── 原声播放:Web Audio API 路径(样本级精确,根治 HTML5 seek 偏移)──
  // HTML5 <audio> 对 VBR 远程流的 seek 用码率估算,误差常达 0.3~1s,
  // 导致"先打开评测页时 seek 越过 This 落到 is"。改用 AudioBuffer:
  // 一次性 decodeAudioData 得到完整 PCM,用 AudioBufferSourceNode 精确
  // 从任意样本起点播放,无 seek 概念,与字幕时间戳严格对齐。
  const playbackContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeGainRef = useRef<GainNode | null>(null);
  const playStartCtxTimeRef = useRef<number>(0); // context.currentTime 当 start() 被调用
  const playStartOffsetRef = useRef<number>(0); // AudioBuffer 内的播放起点(秒)
  // 原声/慢速播放期间的"当前绝对时间"getter（供扫光高亮 hook 60fps 读取）。
  // 仅在 Web Audio 播放中非空；停止/TTS 时为 null → 高亮 hook 自然不点亮。
  const refGetTimeRef = useRef<(() => number) | null>(null);

  // Reset everything when navigating to a different subtitle
  const prevSubtitleIdRef = useRef(subtitle.id);
  useEffect(() => {
    if (prevSubtitleIdRef.current !== subtitle.id) {
      prevSubtitleIdRef.current = subtitle.id;
      hasLocalResultRef.current = false;

      if (previousResult) {
        if (
          !(previousResult as DetailedPracticeRecord).words &&
          previousResult.detailUrl
        ) {
          setResult({ ...previousResult });
          fetch(`/api/speech/detail?id=${previousResult.recognitionid}`)
            .then((res) => res.json())
            .then((resJson) => {
              const details = resJson.data;
              if (details && Array.isArray(details.words)) {
                const wordList = details.words.map((w: any) => ({
                  word: w.word,
                  score: w.pronunciation,
                  phonemes: w.phonemes,
                  start: w.start,
                  end: w.end,
                }));
                if (!hasLocalResultRef.current) {
                  setResult((prev) =>
                    prev ? { ...prev, words: wordList } : undefined,
                  );
                }
              }
            })
            .catch((err) => console.error("OSS Detail Fetch Error", err));
        } else {
          setResult({ ...previousResult });
        }
      } else {
        setResult(undefined);
      }

      setRefAudioProgress(0);
      setIsUserAudioPlaying(false);
      setIsSpeaking(false);
      setIsTTSLoading(false);
    }
  }, [subtitle.id, previousResult]);

  // Sync from previousResult only when we don't have a fresh local result
  useEffect(() => {
    if (!hasLocalResultRef.current) {
      if (previousResult) {
        if (
          !(previousResult as DetailedPracticeRecord).words &&
          previousResult.detailUrl
        ) {
          // Temporarily set without words
          setResult({ ...previousResult });

          fetch(`/api/speech/detail?id=${previousResult.recognitionid}`)
            .then((res) => res.json())
            .then((resJson) => {
              const details = resJson.data;
              if (details && Array.isArray(details.words)) {
                const wordList = details.words.map((w: any) => ({
                  word: w.word,
                  score: w.pronunciation,
                  phonemes: w.phonemes,
                  start: w.start,
                  end: w.end,
                }));
                // Make sure we haven't navigated away or recorded a new one in the meantime
                if (!hasLocalResultRef.current) {
                  setResult((prev) =>
                    prev ? { ...prev, words: wordList } : undefined,
                  );
                }
              }
            })
            .catch((err) =>
              console.error("Failed to fetch speech detail from API", err),
            );
        } else {
          setResult({ ...previousResult });
        }
      } else {
        setResult(undefined);
      }
    }
  }, [previousResult]);

  useEffect(() => {
    userAudioUrlRef.current = result?.userAudioUrl;
  }, [result?.userAudioUrl]);

  const stopAllAudio = useCallback(() => {
    // 停止 Web Audio 原声播放(AudioBufferSourceNode 只能 start 一次,停止即作废)。
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch {
        /* 已停止或未开始,忽略 */
      }
      try {
        activeSourceRef.current.disconnect();
      } catch {
        /* 忽略 */
      }
      activeSourceRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    refGetTimeRef.current = null; // 清除扫光高亮的时间源
    setRefAudioProgress(0);

    // 兼容:同时暂停旧的 HTMLAudioElement 实例(若仍存在)。
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
    }

    if (userAudioInstanceRef.current) {
      userAudioInstanceRef.current.pause();
      userAudioInstanceRef.current = null;
      setIsUserAudioPlaying(false);
    }

    if (ttsAudioInstanceRef.current) {
      ttsAudioInstanceRef.current.pause();
      ttsAudioInstanceRef.current = null;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);
  const speakWithTTS = useCallback(
    async (wordToSpeak?: string) => {
      if (isSpeaking) {
        stopAllAudio();
        return;
      }

      stopAllAudio();
      onPlayStart(subtitle.id);

      try {
        setIsTTSLoading(true);
        const targetText = wordToSpeak || subtitle.textEn;
        const res = await fetch("/api/dictionary/youdao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word: targetText }),
        });

        if (!res.ok) throw new Error("获取朗读地址失败");

        const data = await res.json();
        if (data.speakUrl) {
          const audio = new Audio(data.speakUrl);
          ttsAudioInstanceRef.current = audio;

          audio.onplay = () => setIsSpeaking(true);
          audio.onended = () => {
            setIsSpeaking(false);
            ttsAudioInstanceRef.current = null;
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            ttsAudioInstanceRef.current = null;
            toast.error("播放失败");
          };

          await audio.play();
        } else {
          toast.error("暂无朗读资源");
        }
      } catch (error) {
        console.error("TTS Error:", error);
        toast.error("朗读服务暂时不可用");
        setIsSpeaking(false);
      } finally {
        setIsTTSLoading(false);
      }
    },
    [isSpeaking, stopAllAudio, onPlayStart, subtitle.id, subtitle.textEn],
  );
  const playDictAudio = useCallback(
    (word: string, type: 1 | 2) => {
      stopAllAudio();
      onPlayStart(subtitle.id);

      setIsTTSLoading(true);
      const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
      const audio = new Audio(url);
      ttsAudioInstanceRef.current = audio;

      audio.oncanplay = () => setIsTTSLoading(false);
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        ttsAudioInstanceRef.current = null;
      };
      audio.onerror = () => {
        setIsTTSLoading(false);
        setIsSpeaking(false);
        console.warn("Dict audio failed, falling back to AI TTS");
        speakWithTTS(word);
      };

      audio.play().catch((e) => {
        console.warn("Dict audio play error, falling back to AI TTS:", e);
        setIsTTSLoading(false);
        setIsSpeaking(false);
        speakWithTTS(word);
      });
    },
    [stopAllAudio, onPlayStart, subtitle.id, speakWithTTS],
  );

  const stopRecordingCleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (currentPlayingId !== null && currentPlayingId !== subtitle.id) {
      stopAllAudio();
    }
  }, [currentPlayingId, subtitle.id, stopAllAudio]);

  useEffect(() => {
    return () => {
      stopAllAudio();
      stopRecordingCleanup();
      // 卸载时彻底销毁复用的原声音频实例,释放网络/内存资源
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.src = "";
        audioInstanceRef.current = null;
      }
      // 释放本实例的 Web Audio 播放上下文。
      // 注意:整集 AudioBuffer 缓存在模块级 episodeBufferCache,跨卡片共享,
      // 不在卸载时清空(同一集切换卡片/句子时仍可秒开)。
      if (playbackContextRef.current) {
        try {
          playbackContextRef.current.close();
        } catch {
          /* 忽略 */
        }
        playbackContextRef.current = null;
      }
      if (userAudioUrlRef.current) {
        URL.revokeObjectURL(userAudioUrlRef.current);
      }
    };
  }, [stopAllAudio, stopRecordingCleanup]);

  const startRecording = async () => {
    stopAllAudio();
    if (result?.userAudioUrl) {
      URL.revokeObjectURL(result.userAudioUrl);
    }
    hasLocalResultRef.current = false;
    setResult(undefined);
    audioDataRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext!)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioDataRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("无法访问麦克风，请检查权限设置");
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsProcessing(true);

    stopRecordingCleanup();

    try {
      const buffers = audioDataRef.current;
      if (buffers.length === 0) throw new Error("No audio recorded");

      const totalLength = buffers.reduce((acc, curr) => acc + curr.length, 0);
      const mergedBuffer = new Float32Array(totalLength);
      let offset = 0;
      for (const buffer of buffers) {
        mergedBuffer.set(buffer, offset);
        offset += buffer.length;
      }

      const wavBlob = encodeWAV(mergedBuffer, 16000);
      const userAudioBlobUrl = URL.createObjectURL(wavBlob);

      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(",")[1];

        const response = await evaluateSpeech(
          base64String,
          subtitle.textEn,
          16000,
        );

        setIsProcessing(false);

        if (response.error) {
          toast.error(response.error);
          return;
        }

        const details = response.details as YoudaoResult;
        let wordList: { word: string; score: number }[] = [];
        let speechText = "";

        if (details && Array.isArray(details.words)) {
          wordList = details.words.map((w: any) => ({
            word: w.word,
            score: w.pronunciation,
            phonemes: w.phonemes,
            start: w.start,
            end: w.end,
          }));
          speechText = wordList.map((w) => w.word).join(" ");
        } else {
          speechText = subtitle.textEn;
        }

        const score = Math.round(
          details?.overall || details?.pronunciation || response.score || 0,
        );

        const newResult: DetailedPracticeRecord = {
          recognitionid: Date.now(),
          userid: "current",
          episodeid: "current",
          speechText: speechText,
          accuracyScore: Math.round(details?.pronunciation || 0),
          overallScore: Math.round(details?.overall || 0),
          targetText: subtitle.textEn,
          targetStartTime: subtitle.startSeconds,
          recognitionDate: new Date().toISOString(),
          fluencyScore: Math.round(details?.fluency || 0),
          integrityScore: Math.round(details?.integrity || 0),
          speed: details?.speed ? Math.round(details.speed) : undefined,
          words: wordList,
          userAudioUrl: userAudioBlobUrl,
        };

        hasLocalResultRef.current = true;
        setResult(newResult);
        onEvaluate(
          subtitle.id,
          speechText,
          score,
          newResult,
          details,
          base64String,
        );
      };
    } catch (err) {
      console.error("Processing error:", err);
      setIsProcessing(false);
      toast.error("评测处理失败");
    }
  };

  const playReferenceAudio = (
    playbackRate: number = 1.0,
    customStart?: number,
    customEnd?: number,
  ) => {
    stopAllAudio();
    onPlayStart(subtitle.id);

    const wordsStart =
      subtitle.words && subtitle.words.length > 0
        ? subtitle.words[0].start
        : undefined;
    const wordsEnd =
      subtitle.words && subtitle.words.length > 0
        ? subtitle.words[subtitle.words.length - 1].end
        : undefined;

    const rawStartTime =
      customStart !== undefined
        ? customStart
        : wordsStart !== undefined
          ? wordsStart
          : subtitle.startSeconds;
    const endTime =
      customEnd !== undefined
        ? customEnd
        : wordsEnd !== undefined
          ? wordsEnd
          : subtitle.endSeconds || rawStartTime + 3;

    // ── Web Audio API 精确播放(根治 HTML5 seek 偏移)──
    // HTML5 <audio> 对 VBR 远程流的 seek 用码率估算字节位置,误差常达 0.3~1s,
    // 且无法靠缓冲彻底消除(VBR 帧大小不固定,无 Xing 头时浏览器只能估算)。
    // 这导致"先打开评测页时 seek 越过 This 落到 is",而精读页因复用全局播放器
    // 的已缓冲元素碰巧偏差较小。
    //
    // Web Audio 方案:一次性 fetch 整个音频并 decodeAudioData 得到完整 PCM(AudioBuffer),
    // 用 AudioBufferSourceNode.start(when, offset) 从精确样本起点播放——无 seek 概念,
    // 起点严格等于字幕时间戳,与缓冲状态、打开顺序无关。AudioBuffer 按 URL 缓存,后续句级
    // 播放(同一集)即时响应。句首不需要 padding:offset 精确到样本,从 rawStartTime 起即可。
    const ensurePlaybackContext = () => {
      if (
        !playbackContextRef.current ||
        playbackContextRef.current.state === "closed"
      ) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        playbackContextRef.current = new Ctor();
      }
      return playbackContextRef.current;
    };

    const ensureAudioBuffer = async (): Promise<AudioBuffer> => {
      // 关键:OSS 音频是跨域资源,直接 fetch(arrayBuffer) 会触发 CORS 被拦截。
      // 改走同源代理 /api/episode/audio-proxy?id=episodeId,由后端转发 OSS 流,
      // 这样 fetch 不受 CORS 限制,decodeAudioData 才能拿到完整 PCM。
      const fetchUrl = episodeId
        ? `/api/episode/audio-proxy?id=${encodeURIComponent(episodeId)}`
        : audioUrl;
      // 模块级字节缓存：命中已下载字节 → 跳过 20s 网络下载（跨卡片共享，同集只下载一次）。
      const cached = episodeBufferCache.get(fetchUrl);
      let arrayBuffer: ArrayBuffer;
      if (cached?.bytes) {
        arrayBuffer = cached.bytes;
      } else if (cached?.promise) {
        arrayBuffer = await cached.promise; // 命中进行中的下载，复用同一 promise
      } else {
        // 未命中 → 下载字节，存入模块缓存（解码留给下方用户手势内做）
        const promise = (async () => {
          const res = await fetch(fetchUrl);
          if (!res.ok) throw new Error(`音频下载失败: ${res.status}`);
          return res.arrayBuffer();
        })();
        episodeBufferCache.set(fetchUrl, { bytes: null, promise });
        try {
          arrayBuffer = await promise;
          episodeBufferCache.set(fetchUrl, {
            bytes: arrayBuffer,
            promise: null,
          });
        } catch (e) {
          episodeBufferCache.delete(fetchUrl);
          throw e;
        }
      }
      // 解码在此完成（位于 playReferenceAudio 调用栈内，属于用户手势上下文），
      // 确保此处创建的 AudioContext 进入 running 状态，currentTime 正常推进。
      const ctx = ensurePlaybackContext();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      // decodeAudioData 会消费 ArrayBuffer（detach），后续无法复用，
      // 故对副本解码，保留原始 bytes 供其它卡片解码。
      const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      return buffer;
    };

    const startPlayback = (buffer: AudioBuffer) => {
      const ctx = ensurePlaybackContext();
      // 浏览器自动暂停策略:首次需在用户手势内 resume。
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = playbackRate;
      const gain = ctx.createGain();
      src.connect(gain);
      gain.connect(ctx.destination);
      activeSourceRef.current = src;
      activeGainRef.current = gain;

      const sampleRate = buffer.sampleRate;
      // clamp 到缓冲区范围内,并略加保护。
      const startOffsetSec = Math.max(
        0,
        Math.min(rawStartTime, buffer.duration - 0.02),
      );
      const startOffsetSamples = Math.floor(startOffsetSec * sampleRate);

      src.onended = () => {
        // 自然结束或被 stop() 都会触发;仅当是当前活跃 source 时清理。
        if (activeSourceRef.current === src) {
          activeSourceRef.current = null;
          activeGainRef.current = null;
          if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
          setRefAudioProgress(0);
        }
      };

      const when = ctx.currentTime;
      src.start(when, startOffsetSamples / sampleRate);
      playStartCtxTimeRef.current = when;
      playStartOffsetRef.current = startOffsetSec;
      // 注册当前播放的绝对时间 getter，供扫光高亮 hook 读取。
      // 与下方 tick 进度条用同一计算口径：offset + (ctx - startCtx) * rate
      refGetTimeRef.current = () => {
        const ctx2 = playbackContextRef.current;
        if (!ctx2) return -1;
        const elapsed =
          (ctx2.currentTime - playStartCtxTimeRef.current) * playbackRate;
        return playStartOffsetRef.current + elapsed;
      };

      // rAF 推进进度条并在到达 endTime 时停止。
      const tick = () => {
        if (!activeSourceRef.current || !playbackContextRef.current) return;
        const elapsed =
          (playbackContextRef.current.currentTime -
            playStartCtxTimeRef.current) *
          playbackRate;
        const current = playStartOffsetRef.current + elapsed;

        if (current >= endTime) {
          stopAllAudio();
          return;
        }

        const progressStart =
          wordsStart !== undefined ? wordsStart : subtitle.startSeconds;
        const progressEnd =
          wordsEnd !== undefined
            ? wordsEnd
            : subtitle.endSeconds || progressStart + 3;
        const progress = Math.min(
          100,
          Math.max(
            0,
            ((current - progressStart) / (progressEnd - progressStart)) * 100,
          ),
        );
        setRefAudioProgress(progress);
        rafIdRef.current = requestAnimationFrame(tick);
      };
      rafIdRef.current = requestAnimationFrame(tick);
    };

    ensureAudioBuffer()
      .then(startPlayback)
      .catch((err) => {
        console.error("原声播放失败:", err);
        toast.error("原声加载失败,请重试");
        stopAllAudio();
      });
  };

  const toggleUserAudio = (customStart?: number, customEnd?: number) => {
    if (!result?.userAudioUrl) return;

    if (isUserAudioPlaying) {
      if (userAudioInstanceRef.current) {
        userAudioInstanceRef.current.pause();
        setIsUserAudioPlaying(false);
      }
    } else {
      stopAllAudio();
      const audio = new Audio(result.userAudioUrl);
      userAudioInstanceRef.current = audio;

      if (customStart !== undefined) {
        audio.currentTime = customStart;
      }

      audio.onended = () => {
        setIsUserAudioPlaying(false);
        userAudioInstanceRef.current = null;
      };

      const handleTimeUpdate = () => {
        if (customEnd !== undefined && audio.currentTime >= customEnd) {
          audio.pause();
          setIsUserAudioPlaying(false);
          userAudioInstanceRef.current = null;
          audio.removeEventListener("timeupdate", handleTimeUpdate);
        }
      };

      if (customEnd !== undefined) {
        audio.addEventListener("timeupdate", handleTimeUpdate);
      }

      audio.play().catch((e) => {
        console.error("User audio play error:", e);
        toast.error("无法播放录音");
      });
      setIsUserAudioPlaying(true);
    }
  };

  // ── 后台预加载整集音频（仅下载字节，不解码）──────────────────────────────
  // 首次点原声要等 fetch 整集(20-60MB)→ 20s+ 延迟。挂载后趁空闲预取字节流,
  // 用户首次点击时大概率已就绪→秒开。失败静默(点击时 playReferenceAudio 会重试并 toast)。
  //
  // 关键：预加载【只 fetch 字节、不创建 AudioContext、不 decodeAudioData】。
  // 因为 AudioContext 在非用户手势(idle callback)里创建会进入 suspended 状态,
  // 会污染 playbackContextRef，导致首次点击时 currentTime 不前进、扫光高亮失效。
  // decode + AudioContext 创建都留在 playReferenceAudio（用户手势内）做。
  // 与 playReferenceAudio 共用同一模块缓存 entry,自动去重。
  useEffect(() => {
    const fetchUrl = episodeId
      ? `/api/episode/audio-proxy?id=${encodeURIComponent(episodeId)}`
      : audioUrl;
    if (!fetchUrl) return;

    // 已命中(字节就绪或下载中)则无需再次发起
    const cached = episodeBufferCache.get(fetchUrl);
    if (cached) return;

    const run = () => {
      const promise = (async () => {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`音频下载失败: ${res.status}`);
        return res.arrayBuffer();
      })();
      episodeBufferCache.set(fetchUrl, { bytes: null, promise });
      promise
        .then((bytes) => {
          episodeBufferCache.set(fetchUrl, { bytes, promise: null });
        })
        .catch(() => {
          // 预加载失败：清掉坏 entry，让真正点击时可重试
          episodeBufferCache.delete(fetchUrl);
        });
    };

    // 优先在浏览器空闲时跑，避免抢占首屏渲染；不支持则延迟 1.5s
    const ric = window.requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(() => run(), { timeout: 4000 });
      return () => window.cancelIdleCallback?.(id);
    } else {
      const id = window.setTimeout(run, 1500);
      return () => window.clearTimeout(id);
    }
  }, [episodeId, audioUrl]);

  return {
    isRecording,
    isProcessing,
    result,
    refAudioProgress,
    isUserAudioPlaying,
    isSpeaking,
    isTTSLoading,
    speakWithTTS,
    playDictAudio,
    startRecording,
    stopRecording,
    playReferenceAudio,
    toggleUserAudio,
    // 扫光高亮控制器：仅原声/慢速(Web Audio)播放中有效，TTS/停止时返回 -1
    highlightController: useMemo(
      () => ({
        getTime: () => {
          const fn = refGetTimeRef.current;
          return fn ? fn() : -1;
        },
        isPlaying: () => !!activeSourceRef.current,
      }),
      [],
    ),
  };
}
