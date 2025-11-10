import { User } from "@/app/types/user";
import { TagType } from "@/app/types/tag";

export interface Episode {
  episodeid: string;
  title: string;
  description: string;
  coverUrl: string;
  coverFileName?: string;
  duration: number;
  audioUrl: string;
  audioFileName?: string;
  subtitleEnUrl?: string;
  subtitleEnFileName?: string;
  subtitleZhUrl?: string;
  subtitleZhFileName?: string;
  createAt: string;
  publishAt: string;
  status: string;
  isExclusive: boolean;
  isCommentEnabled: boolean;
  podcast: Podcast;
  tags: EpisodeTags[];
  episodeFavorites: EpisodeFavorites[];
}

export interface Podcast {
  podcastid: string;
  title: string;
  coverUrl: string;
  coverFileName: string;
  platform: string;
  description: string;
  isEditorPick: boolean;
  episode: Episode[];
  tags: PodcastTags[];
  podcastFavorites: PodcastFavorites[];
}

export interface TagGroup {
  groupid: string;
  name: string;
  description: string;
  coverUrl: string;
  coverFileName: string;
  sortOrder: number;
  allowedTypes: TagType[];
  tags: Tag[];
  createAt: string;
  updateAt: string;
  tagLinks: TagGroupTag[];
}
export interface TagGroupTag {
  tagid: string;
  groupid: string;
  sortWeight: number;
  tag: Tag;
  group: TagGroup;
}
export interface Tag {
  tagid: string;
  name: string;
  type: TagType;
  isFeatured: boolean;
  coverUrl: string;
  coverFileName: string;
  tagGroupid: string;
  description: string;
  groupLinks: TagGroupTag[];
  group: TagGroup;
}
export interface PodcastTags {
  podcastid: string;
  tagid: string;
  podcast: Podcast;
  tag: Tag;
  createAt: string;
}

export interface EpisodeTags {
  episodeid: string;
  tagid: string;
  episode: Episode;
  tag: Tag;
  createAt: string;
}

export interface PodcastFavorites {
  favoriteid: number;
  userid: string;
  podcastid: string;
  favoriteDate: string;
  podcast: Podcast;
  user: User;
}

export interface EpisodeFavorites {
  favoriteid: number;
  userid: string;
  episodeid: string;
  favoriteDate: string;
  episode: Episode;
  user: User;
}

// 定义接受上传字幕的接口
export interface UploadSubtitlesResponse {
  status: number;
  message: string;
  subtitleUrl: string;
  subtitleFileName: string;
}

// 定义已上传文件的接口
export interface UploadedSubtitleFile {
  language: string;
  fileName: string;
  response: UploadSubtitlesResponse;
}
