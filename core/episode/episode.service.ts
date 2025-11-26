import { episodeRepository } from "./episode.repository";

export const episodeService = {
  getPublishedEpisodes() {
    return episodeRepository.findAll();
  },

  getEpisode(id: string) {
    return episodeRepository.findById(id);
  },
};
