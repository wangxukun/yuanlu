import { Episode } from "@/core/episode/episode.entity";
import { User } from "@/core/user/user.entity";

export interface Vocabulary {
  vocabularyid: number;
  userid: string | null;
  word: string;
  definition: string | null;
  contextSentence: string | null;
  translation: string | null;
  episodeid: number | null;
  timestamp: number | null;
  speakUrl: string | null;
  dictUrl: string | null;
  webUrl: string | null;
  mobileUrl: string | null;
  proficiency: number;
  addedDate: string | null;
  nextReviewAt: string | null;
  episode: Episode | null;
  user: User | null;
}
