import { create } from "zustand";
import { Episode } from "@/core/episode/episode.entity";

export interface AudioTrack {
  id: string;
  src: string;
  title: string;
  author: string;
  coverUrl: string;
  duration: number;
  initialTime?: number;
}

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioRef: HTMLAudioElement | null;
  currentEpisode: Episode | null;
  currentAudioUrl: string;
  volume: number;
  initialTime: number | null;

  setVolume: (volume: number) => void;
  setAudioRef: (ref: HTMLAudioElement) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setCurrentEpisode: (episode: Episode | null) => void;
  setDuration: (duration: number) => void;
  setCurrentAudioUrl: (url: string) => void;
  setInitialTime: (time: number | null) => void;

  // 确保这一行存在
  setAudio: (audio: AudioTrack) => void;

  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  forward: () => void;
  backward: () => void;
  playEpisode: (episode: Episode) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  audioRef: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  currentAudioUrl: "",
  currentEpisode: null,
  initialTime: null,
  setAudioRef: (ref: HTMLAudioElement) => set({ audioRef: ref }),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setCurrentTime: (time: number) => set({ currentTime: time }),
  setCurrentEpisode: (episode: Episode | null) =>
    set({ currentEpisode: episode }),
  setDuration: (duration: number) => set({ duration: duration }),
  setCurrentAudioUrl: (url: string) => set({ currentAudioUrl: url }),
  setInitialTime: (time) => set({ initialTime: time }),
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
  playEpisode: (episode: Episode) => {
    set({
      currentEpisode: episode,
      currentAudioUrl: episode.audioUrl || "",
      isPlaying: true,
      currentTime: 0,
      initialTime: null,
    });
  },
  setAudio: (audio: AudioTrack) => {
    // 构造兼容 Episode 的对象
    const episode = {
      episodeid: audio.id,
      title: audio.title,
      audioUrl: audio.src,
      coverUrl: audio.coverUrl,
      duration: audio.duration,
      podcast: { title: audio.author },
    } as unknown as Episode;

    set({
      currentEpisode: episode,
      currentAudioUrl: audio.src,
      isPlaying: true,
      initialTime: audio.initialTime || 0,
      currentTime: audio.initialTime || 0,
    });
  },
}));
