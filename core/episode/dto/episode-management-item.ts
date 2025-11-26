// 后台管理列表视图用
export enum Status {
  PUBLISHED = "已发布",
  REVIEWING = "审核中",
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
export interface EpisodeManagementItem {
  id: string;
  title: string;
  coverUrl: string;
  publishDate: string;
  status: Status;
  access: Access;
  stats: Stats;
  duration: string;
}
