import { Episode } from "@/core/episode/episode.entity";
import { Tag } from "@/core/tag/tag.entity";

export interface EpisodeTags {
  episodeid: string;
  tagid: string;
  episode: Episode;
  tag: Tag;
  createAt: string;
}
