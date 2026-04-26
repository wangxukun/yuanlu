// core/podcast/podcast-search.service.ts
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import type {
  PodcastSearchRequestDto,
  PodcastSearchResultDto,
} from "@/core/podcast/podcast-search.dto";

const DEFAULT_SEARCH_LIMIT = 20;

/**
 * Search podcasts by title, description, and tags.
 * This is the single source of truth for all search logic,
 * consumed by both the API route and the web BFF layer.
 */
export async function searchPodcasts(
  dto: PodcastSearchRequestDto,
): Promise<PodcastSearchResultDto[]> {
  const { query, limit = DEFAULT_SEARCH_LIMIT } = dto;

  if (!query || query.trim().length === 0) {
    return [];
  }

  const trimmedQuery = query.trim();

  const podcasts = await prisma.podcast.findMany({
    where: {
      OR: [
        { title: { contains: trimmedQuery, mode: "insensitive" } },
        { description: { contains: trimmedQuery, mode: "insensitive" } },
        {
          tags: {
            some: { name: { contains: trimmedQuery, mode: "insensitive" } },
          },
        },
      ],
    },
    include: {
      tags: {
        select: { id: true, name: true },
      },
      _count: {
        select: { episode: true },
      },
    },
    orderBy: { totalPlays: "desc" },
    take: limit,
  });

  // Sign cover URLs in parallel
  const results: PodcastSearchResultDto[] = await Promise.all(
    podcasts.map(async (podcast) => {
      let signedCoverUrl = podcast.coverUrl;
      if (podcast.coverFileName && podcast.coverUrl !== "default_cover_url") {
        try {
          signedCoverUrl = await generateSignatureUrl(
            podcast.coverFileName,
            3600 * 3,
          );
        } catch (e) {
          console.error(
            `[searchPodcasts] Failed to sign cover for ${podcast.podcastid}`,
            e,
          );
        }
      }

      return {
        podcastid: podcast.podcastid,
        title: podcast.title,
        coverUrl: signedCoverUrl,
        description: podcast.description,
        platform: podcast.platform,
        totalPlays: podcast.totalPlays,
        followerCount: podcast.followerCount,
        episodeCount: podcast._count.episode,
        tags: podcast.tags,
      };
    }),
  );

  return results;
}
