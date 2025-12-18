import { create } from "zustand";
import { Episode } from "@/core/episode/episode.entity";

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioRef: HTMLAudioElement | null;
  currentEpisode: Episode | null;
  currentAudioUrl: string;
  volume: number;
  setVolume: (volume: number) => void;
  setAudioRef: (ref: HTMLAudioElement) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setCurrentEpisode: (episode: Episode | null) => void;
  setDuration: (duration: number) => void;
  setCurrentAudioUrl: (url: string) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  forward: () => void;
  backward: () => void;
  // [新增] 定义 playEpisode 方法类型
  playEpisode: (episode: Episode) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  audioRef: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  currentAudioUrl: "",
  currentEpisode: null,
  setAudioRef: (ref: HTMLAudioElement) => set({ audioRef: ref }),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setCurrentTime: (time: number) => set({ currentTime: time }),
  setCurrentEpisode: (episode: Episode | null) =>
    set({ currentEpisode: episode }),
  setDuration: (duration: number) => set({ duration: duration }),
  setCurrentAudioUrl: (url: string) => set({ currentAudioUrl: url }),
  volume: 1,
  setVolume: (volume: number) => {
    const audio = get().audioRef;
    if (audio) {
      audio.volume = volume;
    }
    set({ volume });
  },
  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },
  play: () => {
    set({ isPlaying: true });
  },
  pause: () => {
    set({ isPlaying: false });
  },
  forward: () => {
    set((state) => {
      const newTime = state.currentTime + 30;
      if (state.audioRef) {
        state.audioRef.currentTime = newTime;
      }
      return { currentTime: newTime };
    });
  },
  backward: () => {
    set((state) => {
      const newTime = state.currentTime - 15;
      if (state.audioRef) {
        state.audioRef.currentTime = newTime;
      }
      return { currentTime: newTime };
    });
  },
  // [新增] 实现 playEpisode 逻辑
  playEpisode: (episode: Episode) => {
    set({
      currentEpisode: episode,
      currentAudioUrl: episode.audioUrl || "", // 确保有播放链接
      isPlaying: true, // 立即开始播放
      currentTime: 0, // 重置进度（Player组件内的 useEffect 会负责恢复历史进度）
    });
  },
}));
