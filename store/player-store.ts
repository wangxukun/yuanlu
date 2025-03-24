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
  // 当前播放的集数
  currentEpisode: Episode | null;
  // 切换播放状态的函数
  togglePlay: () => void;
  // 设置当前播放时间的函数
  setCurrentTime: (time: number) => void;
  // 设置当前播放集数的函数
  setEpisode: (episode: Episode) => void;
  // 设置音频总时长的函数
  setDuration: (duration: number) => void;
}

// 使用create函数创建一个Zustand store，并导出usePlayerStore钩子
export const usePlayerStore = create<PlayerState>((set) => ({
  // 初始化isPlaying为false
  isPlaying: false,
  // 初始化currentTime为0
  currentTime: 0,
  // 初始化duration为0
  duration: 0,
  // 初始化currentEpisode为null
  currentEpisode: null,
  // 定义togglePlay函数，切换isPlaying状态
  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },
  // 定义setCurrentTime函数，设置currentTime
  setCurrentTime: (time) => set({ currentTime: time }),
  // 定义setEpisode函数，设置currentEpisode
  setEpisode: (episode) => set({ currentEpisode: episode }),
  // 定义setDuration函数，设置duration
  setDuration: (duration) => set({ duration: duration }),
}));
