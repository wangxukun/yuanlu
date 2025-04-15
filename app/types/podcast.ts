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
}

export interface Podcast {
  categoryid: number;
  title: string;
  description: string;
  coverUrl: string;
  from: string;
  episode: Episode[];
}
