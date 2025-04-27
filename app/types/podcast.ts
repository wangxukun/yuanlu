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
  category: Podcast;
}

export interface Podcast {
  categoryid: number;
  title: string;
  description: string;
  coverUrl: string;
  from: string;
  episode: Episode[];
}

export interface EpisodeTableData {
  episodeid: string;
  coverUrl: string;
  coverFileName: string;
  title: string;
  duration: string;
  audioUrl: string;
  audioFileName: string;
  subtitleEnUrl: string;
  subtitleEnFileName: string;
  subtitleZhUrl: string;
  subtitleZhFileName: string;
  publishAt: string;
  createAt: string;
  status: string;
  isExclusive: boolean;
  category: {
    categoryid: number;
    title: string;
  };
}
