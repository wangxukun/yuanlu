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

export type SubtitleManagementState = {
  success: boolean;
  message: string;
  error?: string;
};
