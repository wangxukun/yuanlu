import { Episode } from "@/core/episode/episode.entity";
import { PodcastFavorites } from "@/core/podcast-favorites/podcast-favorites.entity";
import { Tag } from "@/core/tag/tag.entity";

export interface Podcast {
  podcastid: string;
  title: string;
  coverUrl: string;
  coverFileName: string | null;
  platform: string | null;
  description: string | null;
  isEditorPick: boolean | null;
  totalPlays: number;
  followerCount: number;
  createAt: Date | string;
  episode: Episode[];
  tags: Tag[];
  podcastFavorites: PodcastFavorites[];
}
