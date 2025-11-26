import { Podcast } from "@/core/podcast/podcast.entity";
import { User } from "@/core/user/user.entity";

export interface PodcastFavorites {
  favoriteid: number;
  userid: string;
  podcastid: string;
  favoriteDate: string;
  podcast: Podcast;
  user: User;
}
