// 导入create函数，用于创建 Zustand store
import { create } from "zustand";
// 导入Episode类型，用于定义当前播放的集数
import { Episode } from "@/app/types/podcast";

// 定义PlayerState接口，描述播放器的状态和操作
interface PlayerState {
  // 播放器是否正在播放
  isPlaying: boolean;
  // 当前播放时间
  currentTime: number;
  // 音频总时长
  duration: number;
  // 播放器的引用
  audioRef: HTMLAudioElement | null;
  // 当前播放的集数
  currentEpisode: Episode | null;
  // 当前播放的音频URL
  currentAudioUrl: string;
  // 音频音量大小
  volume: number;
  // 设置音频音量大小的函数
  setVolume: (volume: number) => void;
  // 绑定audioRef的函数
  setAudioRef: (ref: HTMLAudioElement) => void;
  // 设置isPlaying状态的函数
  setIsPlaying: (isPlaying: boolean) => void;
  // 设置当前播放时间的函数
  setCurrentTime: (time: number) => void;
  // 设置当前播放集数的函数
  setCurrentEpisode: (episode: Episode) => void;
  // 设置音频总时长的函数
  setDuration: (duration: number) => void;
  // 设置当前播放音频的URL的函数
  setCurrentAudioUrl: (url: string) => void;
  // 切换播放状态的函数
  togglePlay: () => void;
  // 播放的函数
  play: () => void;
  // 暂停的函数
  pause: () => void;
  // 前进和后退的函数
  forward: () => void;
  backward: () => void;
}

// 使用create函数创建一个Zustand store，并导出usePlayerStore钩子
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
  setCurrentEpisode: (episode: Episode) => set({ currentEpisode: episode }),
  setDuration: (duration: number) => set({ duration: duration }),
  setCurrentAudioUrl: (url: string) => set({ currentAudioUrl: url }),
  volume: 1, // 默认最大音量 (0-1范围)
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
    const audio = get().audioRef;
    if (audio) {
      audio.play();
      set({ isPlaying: true });
    }
  },
  pause: () => {
    const audio = get().audioRef;
    if (audio) {
      audio.pause();
      set({ isPlaying: false });
    }
  },
  // 定义forward函数，前进currentTime
  forward: () => {
    set((state) => {
      const newTime = state.currentTime + 30;
      state.audioRef!.currentTime = newTime;
      return { currentTime: newTime };
    });
  },
  // 定义backward函数，后退currentTime
  backward: () => {
    set((state) => {
      const newTime = state.currentTime - 15;
      state.audioRef!.currentTime = newTime;
      return { currentTime: newTime };
    });
  },
}));
