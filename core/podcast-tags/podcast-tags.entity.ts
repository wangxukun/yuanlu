import { Podcast } from "@/core/podcast/podcast.entity";
import { Tag } from "@/core/tag/tag.entity";

export interface PodcastTags {
  podcastid: string;
  tagid: string;
  podcast: Podcast;
  tag: Tag;
  createAt: string;
}
