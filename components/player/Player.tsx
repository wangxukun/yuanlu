"use client";
import { usePlayerStore } from "@/store/player-store";
import { useEffect, useRef } from "react";
import { debounce } from "lodash";
import { formatTime } from "@/lib/tools";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import PodcastIcon from "@/components/icons/PodcastIcon";
import Image from "next/image";
import { useTheme } from "next-themes";

export default function Player() {
  const audioRef = useRef<HTMLAudioElement>(null!);
  const setAudioRef = usePlayerStore((state) => state.setAudioRef);
  const currentEpisode = usePlayerStore((state) => state.currentEpisode);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const duration = usePlayerStore((state) => state.duration);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const pause = usePlayerStore((state) => state.pause);
  const setCurrentEpisode = usePlayerStore((state) => state.setCurrentEpisode);
  const setCurrentAudioUrl = usePlayerStore(
    (state) => state.setCurrentAudioUrl,
  );
  const { theme } = useTheme();

  const logoSrc =
    theme === "dark"
      ? "/static/images/podcast-logo-dark.png"
      : "/static/images/podcast-logo-light.png";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      pause();
      setCurrentTime(0);
      setCurrentEpisode(null);
      setCurrentAudioUrl("");
    };

    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [pause, setCurrentTime, setCurrentEpisode, setCurrentAudioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) setAudioRef(audio);
  }, [setAudioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch((error) => {
        console.error("播放音频时出错:", error);
      });
    } else {
      audio.pause();
    }

    const updateTime = () => setCurrentTime(audio.currentTime);
    audio.addEventListener("timeupdate", updateTime);
  }, [isPlaying]);

  const handleProgressChange = (newTime: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const debouncedSeek = debounce((newTime: number) => {
    handleProgressChange(newTime);
  }, 300);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  return (
    <div className="group/player flex items-center w-full border border-base-300 bg-base-200 rounded-xl shadow-md overflow-hidden">
      {/* 封面区 */}
      <button className="relative flex bg-base-200 border-r border-base-300 hover:brightness-110 transition-all">
        <div className="invisible group-hover/player:visible absolute inset-0 flex items-center justify-center bg-black/30">
          <ArrowsPointingOutIcon className="w-6 h-6 text-white opacity-70" />
        </div>
        {currentEpisode ? (
          <div className="w-[48px] h-[48px]">
            <img
              src={currentEpisode.coverUrl}
              alt="封面"
              className="w-full h-full object-cover rounded-none"
            />
          </div>
        ) : (
          <PodcastIcon size={48} fill="fill-gray-300" />
        )}
      </button>

      {/* 内容区 */}
      <div className="flex-1 flex flex-col justify-center px-2">
        {currentEpisode ? (
          <>
            <div className="flex items-center justify-between text-xs text-base-content/70">
              <span className="invisible group-hover/player:visible pl-1">
                {formatTime(currentTime)}
              </span>
              <span className="font-semibold text-base-content truncate max-w-[30ch] text-sm">
                {currentEpisode?.title || "暂无播放"}
              </span>
              <span className="invisible group-hover/player:visible pr-1">
                {formatTime(duration || 0)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => debouncedSeek(Number(e.target.value))}
              onMouseUp={(e) =>
                handleProgressChange(Number(e.currentTarget.value))
              }
              onTouchEnd={(e) =>
                handleProgressChange(Number(e.currentTarget.value))
              }
              className="range range-xs range-primary mt-1 w-full"
            />
          </>
        ) : (
          <div className="flex justify-center items-center w-full">
            <Image src={logoSrc} alt="logo" width={40} height={40} />
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        onEnded={() => setCurrentTime(0)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedData={(e) => {
          setCurrentTime(0);
          setDuration(e.currentTarget.duration);
        }}
        onError={(e) => console.error("音频错误:", e.currentTarget.error)}
      />
    </div>
  );
}
