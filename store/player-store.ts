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
    // [修改] 移除 audio.play()，只更新状态，由 Player 组件的 useEffect 响应变化
    set({ isPlaying: true });
  },
  pause: () => {
    // [修改] 移除 audio.pause()，只更新状态
    set({ isPlaying: false });
  },
  forward: () => {
    set((state) => {
      const newTime = state.currentTime + 30;
      // 这里可以直接操作，因为是瞬时动作，不会引发状态冲突
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
}));
