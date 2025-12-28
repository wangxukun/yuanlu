import { Tag } from "@/core/tag/tag.entity";

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
  difficulty: string | null;
  tags: Tag[];
}
