import { EpisodeTags } from "@/core/episode-tags/episode-tags.entity";

export interface EpisodeEditItem {
  episodeid: string;
  title: string;
  description: string;
  audioFileName: string;
  audioUrl: string;
  podcastid: string;
  isExclusive: boolean;
  publishAt: string;
  status: string;
  tags: EpisodeTags[];
}
