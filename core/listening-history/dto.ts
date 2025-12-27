// core/listening-history/dto.ts

export interface HistoryEpisode {
  id: string;
  title: string;
  author: string; // 通常对应 Podcast 标题
  thumbnailUrl: string;
  duration: string; // 格式化后的时间字符串 (e.g., "12:34")
  durationSeconds: number;
  category: string;
  level?: string;
}

export interface ListeningHistoryItem {
  historyid: number;
  listenAt: string; // ISO Date string
  progressSeconds: number;
  isFinished: boolean;
  episode: HistoryEpisode;
}

// 用于前端展示的最近历史DTO接口
export interface RecentHistoryItemDto {
  historyId: number;
  episodeId: string;
  title: string;
  coverUrl: string;
  audioUrl: string;
  progress: number; // 进度百分比 (0-100)
  progressSeconds: number;
  duration: number;
  listenAt: string; // ISO String
  isFinished: boolean;
  author: string; // 播客名称／作者
}
