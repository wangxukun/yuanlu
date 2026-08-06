/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  words?: { word: string; score: number }[];
  userAudioUrl?: string; // 本地录音回放地址
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

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
  previousResult,
  onEvaluate,
  currentPlayingId,
  onPlayStart,
}: {
  subtitle: Subtitle;
  audioUrl: string;
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

  // Reset everything when navigating to a different subtitle
  const prevSubtitleIdRef = useRef(subtitle.id);
  useEffect(() => {
    if (prevSubtitleIdRef.current !== subtitle.id) {
      prevSubtitleIdRef.current = subtitle.id;
      hasLocalResultRef.current = false;

      if (previousResult) {
        if (!previousResult.words && previousResult.detailUrl) {
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
        if (!previousResult.words && previousResult.detailUrl) {
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
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setRefAudioProgress(0);

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

    const audio = new Audio(audioUrl);
    audio.playbackRate = playbackRate;
    audioInstanceRef.current = audio;

    const startTime =
      customStart !== undefined ? customStart : subtitle.startSeconds;
    const endTime =
      customEnd !== undefined
        ? customEnd
        : subtitle.endSeconds || startTime + 3;

    audio.currentTime = startTime;
    audio.play().catch((err) => console.error("Play error:", err));

    const tick = () => {
      if (!audioInstanceRef.current) return;
      const audio = audioInstanceRef.current;

      if (audio.paused && audio.currentTime === 0) {
        stopAllAudio();
        return;
      }

      const current = audio.currentTime;
      if (current >= endTime) {
        audio.pause();
        stopAllAudio();
        return;
      }

      const progress = Math.min(
        100,
        Math.max(
          0,
          ((current - subtitle.startSeconds) /
            ((subtitle.endSeconds || subtitle.startSeconds + 3) -
              subtitle.startSeconds)) *
            100,
        ),
      );
      setRefAudioProgress(progress);
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
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
  };
}
