export interface RecommendedEpisodeDto {
  id: string;
  title: string;
  podcastTitle: string; // 对应原 author
  category: string; // 对应 tags[0]
  duration: string; // 格式化后的时长 (e.g. "45 min")
  coverUrl: string;
  difficulty: string; // 难度 (e.g. "B1")
  isExclusive?: boolean; // 是否为 PRO 独家
  playCount?: number; // 播放次数
}
