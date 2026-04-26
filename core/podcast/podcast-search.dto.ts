// core/podcast/podcast-search.dto.ts

/**
 * Search request DTO
 */
export interface PodcastSearchRequestDto {
  query: string;
  limit?: number;
}

/**
 * Individual podcast search result DTO
 */
export interface PodcastSearchResultDto {
  podcastid: string;
  title: string;
  coverUrl: string;
  description: string | null;
  platform: string | null;
  totalPlays: number;
  followerCount: number;
  episodeCount: number;
  tags: { id: number; name: string }[];
}

/**
 * Search response DTO
 */
export interface PodcastSearchResponseDto {
  success: boolean;
  data: PodcastSearchResultDto[];
  query: string;
  total: number;
  error?: string;
}
