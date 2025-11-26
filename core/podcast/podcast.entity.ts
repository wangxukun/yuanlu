import { Episode } from "@/core/episode/episode.entity";
import { PodcastFavorites } from "@/core/podcast-favorites/podcast-favorites.entity";
import { PodcastTags } from "@/core/podcast-tags/podcast-tags.entity";

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
