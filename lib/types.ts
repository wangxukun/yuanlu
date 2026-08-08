export enum Status {
  PUBLISHED = "已发布",
  REVIEWING = "审核中",
  DRAFT = "草稿",
}

export enum Access {
  FREE = "免费",
  MEMBER = "会员",
}

export interface Stats {
  likes: number;
  plays: number;
  favorites: number;
  shares: number;
  comments: number;
}

export interface Episode {
  id: string;
  title: string;
  coverUrl: string;
  publishDate: string;
  status: Status;
  access: Access;
  stats: Stats;
  duration: string;
}

export type ActionState = {
  success: boolean;
  message: string;
  error?: string;
};

export interface MergedSubtitleItem {
  id: number;
  start: number;
  end: number;
  speaker?: string;
  textEn: string;
  textCn: string;
  words?: { word: string; start: number; end: number }[];
}

export interface Subtitle {
  id: number; // 字幕序号或唯一标识
  startSeconds: number; // 开始时间（秒）
  endSeconds?: number; // 结束时间（秒），可选
  textEn: string; // 英文原文
  textCn?: string; // 中文翻译（可选）
  speaker?: string; // 说话人标识（可选，由 practice-data 提供）
  words?: { word: string; start: number; end: number }[]; // 词级时间戳（可选），start/end 为相对全集音频的绝对秒数
}

export interface SpeechPracticeRecord {
  recognitionid: number;
  userid: string;
  episodeid: string;
  speechText: string; // 用户录入的语音文本
  accuracyScore: number; // 评分 (0-100)
  targetText: string; // 对应的原文句子
  targetStartTime: number; // 对应的原文开始时间（用于定位）
  recognitionDate: string; // ISO 格式的日期字符串

  // 新增字段
  fluencyScore?: number;
  integrityScore?: number;
  overallScore?: number;
  speed?: number;
  detailUrl?: string;
  userAudioUrl?: string;
  subtitleId?: number;
}
