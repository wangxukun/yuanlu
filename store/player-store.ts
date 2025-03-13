// 新建store/player-store.ts
import { create } from "zustand";
import { Episode } from "@/app/types/podcast";

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentEpisode: Episode | null;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setEpisode: (episode: Episode) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  currentEpisode: null,
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setEpisode: (episode) => set({ currentEpisode: episode }),
}));
