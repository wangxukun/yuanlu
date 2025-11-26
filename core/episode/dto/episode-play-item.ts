// 播放页视图用
export interface EpisodePlayItem {
  id: string;
  title: string;
  description: string | null;
  audioUrl: string;
  coverUrl: string | null;
  duration: number;
}
