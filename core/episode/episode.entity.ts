import { EpisodeFavorites } from "@/core/episode-favorites/episode-favorite.entity";
import { Podcast } from "@/core/podcast/podcast.entity";
import { Tag } from "@/core/tag/tag.entity";

export interface Episode {
  episodeid: string;
  title: string;
  description: string;
  audioFileName: string;
  audioUrl: string;
  coverFileName: string;
  coverUrl: string;
  subtitleEnFileName: string;
  subtitleZhFileName: string;
  subtitleEnUrl: string;
  subtitleZhUrl: string;
  podcastid: string;
  isExclusive: boolean;
  publishAt: string;
  duration: number;
  createAt: string;
  updateAt: string;
  status: string;
  uploaderid: string;
  isCommentEnabled: boolean;
  playCount: number;
  podcast: Podcast;
  tags: Tag[];
  episode_favorites: EpisodeFavorites[];
}
