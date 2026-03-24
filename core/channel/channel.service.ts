// core/channel/channel.service.ts
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import { Prisma } from "@prisma/client";
import { cache } from "react";

/**
 * Get channel data by platform name.
 * Returns top shows (podcasts) and top episodes under the given platform.
 */
export const getChannelData = cache(async (platformName: string) => {
  if (!platformName) return null;

  // 1. Query all podcasts under this platform
  const podcasts = await prisma.podcast.findMany({
    where: {
      platform: {
        equals: platformName,
        mode: "insensitive",
      },
    },
    orderBy: {
      totalPlays: Prisma.SortOrder.desc,
    },
    include: {
      tags: {
        take: 2,
        select: { id: true, name: true },
      },
      _count: {
        select: { episode: true },
      },
    },
  });

  if (podcasts.length === 0) return null;

  // 2. Query top episodes across all podcasts under this platform
  const podcastIds = podcasts.map((p) => p.podcastid);

  const topEpisodes = await prisma.episode.findMany({
    where: {
      podcastid: { in: podcastIds },
      status: "published",
    },
    orderBy: {
      playCount: Prisma.SortOrder.desc,
    },
    take: 9,
    select: {
      episodeid: true,
      title: true,
      description: true,
      coverUrl: true,
      coverFileName: true,
      duration: true,
      playCount: true,
      audioUrl: true,
      audioFileName: true,
      subtitleEnUrl: true,
      subtitleEnFileName: true,
      subtitleZhUrl: true,
      subtitleZhFileName: true,
      publishAt: true,
      createAt: true,
      status: true,
      isExclusive: true,
      podcastid: true,
      podcast: {
        select: {
          podcastid: true,
          title: true,
          coverUrl: true,
          coverFileName: true,
          platform: true,
        },
      },
    },
  });

  // 3. Sign OSS URLs for podcast covers
  const processedPodcasts = await Promise.all(
    podcasts.map(async (podcast) => {
      let coverUrl = podcast.coverUrl;
      if (podcast.coverFileName) {
        try {
          coverUrl = await generateSignatureUrl(
            podcast.coverFileName,
            3600 * 3,
          );
        } catch (e) {
          console.error(
            `Failed to sign cover for podcast ${podcast.podcastid}`,
            e,
          );
        }
      }

      return {
        podcastid: podcast.podcastid,
        title: podcast.title,
        coverUrl,
        platform: podcast.platform,
        description: podcast.description,
        totalPlays: podcast.totalPlays,
        followerCount: podcast.followerCount,
        createAt: podcast.createAt,
        tags: podcast.tags,
        episodeCount: podcast._count.episode,
      };
    }),
  );

  // 4. Sign OSS URLs for episode covers and audio
  const processedEpisodes = await Promise.all(
    topEpisodes.map(async (ep) => {
      let coverUrl = ep.coverUrl;
      let audioUrl = ep.audioUrl;
      let subtitleEnUrl = ep.subtitleEnUrl;
      let subtitleZhUrl = ep.subtitleZhUrl;

      if (ep.coverFileName) {
        try {
          coverUrl = await generateSignatureUrl(ep.coverFileName, 3600 * 3);
        } catch (e) {
          console.error(e);
        }
      }
      if (ep.audioFileName) {
        try {
          audioUrl = await generateSignatureUrl(ep.audioFileName, 3600 * 3);
        } catch (e) {
          console.error(e);
        }
      }
      if (ep.subtitleEnFileName) {
        try {
          subtitleEnUrl = await generateSignatureUrl(
            ep.subtitleEnFileName,
            3600 * 3,
          );
        } catch (e) {
          console.error(e);
        }
      }
      if (ep.subtitleZhFileName) {
        try {
          subtitleZhUrl = await generateSignatureUrl(
            ep.subtitleZhFileName,
            3600 * 3,
          );
        } catch (e) {
          console.error(e);
        }
      }

      // Also sign the podcast cover if needed
      let podcastCoverUrl = ep.podcast?.coverUrl || "";
      if (ep.podcast?.coverFileName) {
        try {
          podcastCoverUrl = await generateSignatureUrl(
            ep.podcast.coverFileName,
            3600 * 3,
          );
        } catch (e) {
          console.error(e);
        }
      }

      return {
        ...ep,
        coverUrl,
        audioUrl,
        subtitleEnUrl,
        subtitleZhUrl,
        podcast: ep.podcast
          ? {
              ...ep.podcast,
              coverUrl: podcastCoverUrl,
            }
          : null,
      };
    }),
  );

  return {
    platformName,
    podcastCount: podcasts.length,
    topShows: processedPodcasts,
    topEpisodes: processedEpisodes,
  };
});

/** Return type for channel data */
export type ChannelData = NonNullable<
  Awaited<ReturnType<typeof getChannelData>>
>;
export type ChannelShow = ChannelData["topShows"][number];
export type ChannelEpisode = ChannelData["topEpisodes"][number];
