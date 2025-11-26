import { Episode } from "@/core/episode/episode.entity";
import { User } from "@/core/user/user.entity";

export interface EpisodeFavorites {
  favoriteid: number;
  userid: string;
  episodeid: string;
  favoriteDate: string;
  episode: Episode;
  user: User;
}
