import { User } from "@/app/types/user";

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
  episodeTags: EpisodeTags[];
  episodeFavorites: EpisodeFavorites[];
}

export interface Podcast {
  podcastid: string;
  title: string;
  coverUrl: string;
  coverFileName: string;
  platform: string;
  description: string;
  episode: Episode[];
  podcastTags: PodcastTags[];
  podcastFavorites: PodcastFavorites[];
}
export interface Tag {
  tagid: string;
  name: string;
  createAt: string;
}
export interface PodcastTags {
  id: number;
  podcastid: string;
  tagid: string;
  podcast: Podcast;
  tag: Tag;
}

export interface EpisodeTags {
  id: number;
  episodeid: string;
  tagid: string;
  episode: Episode;
  tag: Tag;
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
