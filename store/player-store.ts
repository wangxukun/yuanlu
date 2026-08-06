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
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;

  // Playlist & Playback modes
  playlist: Episode[];
  setPlaylist: (episodes: Episode[]) => void;
  addToPlaylist: (episode: Episode) => void;
  removeFromPlaylist: (episodeId: string) => void;
  loopMode: "none" | "all" | "one";
  setLoopMode: (mode: "none" | "all" | "one") => void;
  toggleLoopMode: () => void;
  isShuffle: boolean;
  toggleShuffle: () => void;
  // 单一播放模式按钮循环切换:不循环 → 列表循环 → 单曲循环 → 随机 → 不循环
  cyclePlayMode: () => void;
  isPlaylistOpen: boolean;
  setIsPlaylistOpen: (isOpen: boolean) => void;
  // 沉浸式逐字稿（FullContentTranscript）开关，全局可控
  isLyricsOpen: boolean;
  setIsLyricsOpen: (isOpen: boolean) => void;
  // 全屏沉浸式语音评测开关
  isPracticeOpen: boolean;
  setIsPracticeOpen: (isOpen: boolean) => void;
  // 字幕模式：read=精读 dictate=听写（FullContentTranscript 与 PlayControlBar 共享）
  transcriptMode: "read" | "dictate";
  setTranscriptMode: (mode: "read" | "dictate") => void;
  // 移动端播放器全屏面板开关
  isMobileSheetOpen: boolean;
  setIsMobileSheetOpen: (isOpen: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;

  setAudio: (audio: AudioTrack) => void;

  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  forward: () => void;
  backward: () => void;
  playEpisode: (episode: Episode) => void;
  closePlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  audioRef: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  currentAudioUrl: "",
  currentEpisode: null,
  initialTime: null,
  playlist: [],
  loopMode: "none",
  isShuffle: false,
  isPlaylistOpen: false,
  isLyricsOpen: false,
  isPracticeOpen: false,
  isMobileSheetOpen: false,
  transcriptMode: "read",

  setAudioRef: (ref: HTMLAudioElement) => set({ audioRef: ref }),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setCurrentTime: (time: number) => set({ currentTime: time }),
  setCurrentEpisode: (episode: Episode | null) =>
    set({ currentEpisode: episode }),
  setDuration: (duration: number) => set({ duration: duration }),
  setCurrentAudioUrl: (url: string) => set({ currentAudioUrl: url }),
  setInitialTime: (time) => set({ initialTime: time }),

  setPlaylist: (episodes) => set({ playlist: episodes }),
  addToPlaylist: (episode) => {
    set((state) => {
      // Check if already in playlist
      if (state.playlist.some((ep) => ep.episodeid === episode.episodeid)) {
        return state;
      }
      return { playlist: [...state.playlist, episode] };
    });
  },
  removeFromPlaylist: (episodeId) => {
    set((state) => ({
      playlist: state.playlist.filter((ep) => ep.episodeid !== episodeId),
    }));
  },
  setLoopMode: (mode) => set({ loopMode: mode }),
  toggleLoopMode: () => {
    set((state) => {
      const modes: ("none" | "all" | "one")[] = ["none", "all", "one"];
      const nextIndex = (modes.indexOf(state.loopMode) + 1) % modes.length;
      return { loopMode: modes[nextIndex] };
    });
  },
  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  cyclePlayMode: () => {
    const { isShuffle, loopMode } = get();
    if (isShuffle) {
      set({ isShuffle: false, loopMode: "none" });
    } else if (loopMode === "none") {
      set({ loopMode: "all" });
    } else if (loopMode === "all") {
      set({ loopMode: "one" });
    } else {
      set({ isShuffle: true });
    }
  },
  setIsPlaylistOpen: (isOpen) => set({ isPlaylistOpen: isOpen }),
  setIsLyricsOpen: (isOpen) => set({ isLyricsOpen: isOpen }),
  setIsPracticeOpen: (isOpen) => set({ isPracticeOpen: isOpen }),
  setTranscriptMode: (mode) => set({ transcriptMode: mode }),
  setIsMobileSheetOpen: (isOpen: boolean) => set({ isMobileSheetOpen: isOpen }),

  playNext: () => {
    const { playlist, currentEpisode, isShuffle, loopMode } = get();
    if (playlist.length === 0) return;

    if (loopMode === "one" && currentEpisode) {
      // If looping one, maybe just restart it?
      // Usually "next" button skips the loop one, but let's just play next in the list.
    }

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * playlist.length);
      get().playEpisode(playlist[randomIndex]);
      return;
    }

    const currentIndex = playlist.findIndex(
      (ep) => ep.episodeid === currentEpisode?.episodeid,
    );

    if (currentIndex === -1 || currentIndex === playlist.length - 1) {
      if (loopMode === "all") {
        get().playEpisode(playlist[0]);
      } else {
        // Stop playing or do nothing
        set({ isPlaying: false });
      }
    } else {
      get().playEpisode(playlist[currentIndex + 1]);
    }
  },

  playPrevious: () => {
    const { playlist, currentEpisode, isShuffle } = get();
    if (playlist.length === 0) return;

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * playlist.length);
      get().playEpisode(playlist[randomIndex]);
      return;
    }

    const currentIndex = playlist.findIndex(
      (ep) => ep.episodeid === currentEpisode?.episodeid,
    );

    if (currentIndex === -1 || currentIndex === 0) {
      // If at the beginning, maybe go to the last one if loop all?
      if (get().loopMode === "all") {
        get().playEpisode(playlist[playlist.length - 1]);
      }
    } else {
      get().playEpisode(playlist[currentIndex - 1]);
    }
  },

  playbackRate: 1.0,
  setPlaybackRate: (rate: number) => {
    const audio = get().audioRef;
    if (audio) {
      audio.playbackRate = rate;
    }
    set({ playbackRate: rate });
  },
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
    set((state) => {
      // If playing an episode not in playlist, maybe add it to playlist?
      // For now, keep playlist as is.
      const newPlaylist =
        state.playlist.length === 0 ? [episode] : state.playlist;
      return {
        currentEpisode: episode,
        currentAudioUrl: episode.audioUrl || "",
        isPlaying: true,
        currentTime: 0,
        initialTime: null,
        playlist: newPlaylist,
      };
    });
  },
  setAudio: (audio: AudioTrack) => {
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
  closePlayer: () => {
    set({
      isPlaying: false,
      currentEpisode: null,
      currentAudioUrl: "",
      currentTime: 0,
      isPlaylistOpen: false,
      isLyricsOpen: false,
      transcriptMode: "read",
    });
  },
}));
