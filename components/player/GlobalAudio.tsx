// components/player/GlobalAudio.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/store/player-store";
import { useSaveProgress } from "@/lib/hooks/useSaveProgress";
import { incrementPlayCount } from "@/lib/actions/analytics-actions";

export default function GlobalAudio() {
  const audioRef = useRef<HTMLAudioElement>(null!);

  const {
    setAudioRef,
    currentEpisode,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    isPlaying,
    pause,
    setCurrentEpisode,
    currentAudioUrl,
    setCurrentAudioUrl,
  } = usePlayerStore();

  const resumeTimeRef = useRef<number | null>(null);
  const loggedEpisodeIdRef = useRef<string | null>(null);
  const unsentSecondsRef = useRef<number>(0);

  const { saveToBackend } = useSaveProgress({
    episodeId: currentEpisode?.episodeid || "",
    currentTime,
    isPlaying,
    duration,
  });

  // 1. 心跳上报逻辑
  const reportListeningTime = useCallback(async (seconds: number) => {
    if (seconds <= 0) return;
    try {
      await fetch("/api/auth/update-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds }),
        keepalive: true,
      });
    } catch (e) {
      console.error("Failed to report listening time", e);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        unsentSecondsRef.current += 1;
        if (unsentSecondsRef.current >= 30) {
          reportListeningTime(unsentSecondsRef.current);
          unsentSecondsRef.current = 0;
        }
      }, 1000);
    }
    return () => {
      clearInterval(interval);
      if (unsentSecondsRef.current > 0) {
        reportListeningTime(unsentSecondsRef.current);
        unsentSecondsRef.current = 0;
      }
    };
  }, [isPlaying, reportListeningTime]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (unsentSecondsRef.current > 0) {
        const blob = new Blob(
          [JSON.stringify({ seconds: unsentSecondsRef.current })],
          { type: "application/json" },
        );
        navigator.sendBeacon("/api/auth/update-activity", blob);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // 2. 进度恢复逻辑
  const tryRestoreProgress = useCallback(() => {
    const audio = audioRef.current;
    const targetTime = resumeTimeRef.current;
    if (targetTime !== null && audio && audio.readyState >= 1) {
      audio.currentTime = targetTime;
      setCurrentTime(targetTime);
      resumeTimeRef.current = null;
    }
  }, [setCurrentTime]);

  useEffect(() => {
    if (!currentEpisode?.episodeid) return;
    resumeTimeRef.current = null;

    const fetchEpisodeStatus = async () => {
      try {
        const res = await fetch(`/api/episode/${currentEpisode.episodeid}`);
        if (res.ok) {
          const data = await res.json();
          const savedProgress = data?.userState?.progressSeconds;
          const isFinished = data?.userState?.isFinished;

          if (isFinished) {
            resumeTimeRef.current = null;
            setCurrentTime(0);
            if (audioRef.current) audioRef.current.currentTime = 0;
          } else if (typeof savedProgress === "number" && savedProgress > 0) {
            resumeTimeRef.current = savedProgress;
            tryRestoreProgress();
          } else {
            resumeTimeRef.current = null;
            setCurrentTime(0);
            if (audioRef.current) audioRef.current.currentTime = 0;
          }
        }
      } catch (error) {
        console.error("无法获取历史进度:", error);
      }
    };
    fetchEpisodeStatus();
  }, [currentEpisode?.episodeid, setCurrentTime, tryRestoreProgress]);

  // 3. 播放量统计
  useEffect(() => {
    if (
      currentEpisode &&
      isPlaying &&
      currentEpisode.episodeid !== loggedEpisodeIdRef.current
    ) {
      const podcastId =
        currentEpisode.podcastid || currentEpisode.podcast?.podcastid || "";
      incrementPlayCount(currentEpisode.episodeid, podcastId);
      loggedEpisodeIdRef.current = currentEpisode.episodeid;
    }
  }, [currentEpisode?.episodeid, isPlaying, currentEpisode]);

  // 4. Audio 实例绑定与事件监听
  useEffect(() => {
    if (audioRef.current) setAudioRef(audioRef.current);
  }, [setAudioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          if (e.name !== "AbortError") console.error("播放音频出错:", e);
        });
      }
    } else {
      audio.pause();
    }

    const updateTime = () => {
      if (resumeTimeRef.current !== null) return;
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener("timeupdate", updateTime);
    return () => audio.removeEventListener("timeupdate", updateTime);
  }, [isPlaying, currentAudioUrl, setCurrentTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      tryRestoreProgress();
    };
    const handleCanPlay = () => tryRestoreProgress();
    const handleEnded = () => {
      if (currentEpisode?.episodeid) saveToBackend(audio.duration, true, true);
      pause();
      setCurrentTime(0);
      resumeTimeRef.current = null;
      setCurrentEpisode(null);
      setCurrentAudioUrl("");
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [
    pause,
    setCurrentTime,
    setCurrentEpisode,
    setCurrentAudioUrl,
    saveToBackend,
    currentEpisode,
    setDuration,
    tryRestoreProgress,
  ]);

  return (
    <audio
      ref={audioRef}
      src={currentAudioUrl || undefined}
      onLoadedData={(e) => setDuration(e.currentTarget.duration)}
      onError={(e) => console.error("音频错误:", e.currentTarget.error)}
      className="hidden"
    />
  );
}
