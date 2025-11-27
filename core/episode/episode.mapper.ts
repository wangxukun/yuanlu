/**
 * Mapper 层 = 只做不同视图输出类型的转换
 *
 * 例如：
 * Episode → EpisodeManagementItem
 * Episode → EpisodePlayItem
 * Episode → EpisodeListItem
 * Episode → EpisodeDetail
 * 前端视图不同 → 输出对象不同
 * 所有这类转换，都不应该放在 API Route 层。
 */
import { Episode } from "./episode.entity";
import {
  Access,
  EpisodeManagementItem,
  Status,
} from "./dto/episode-management-item";
import { EpisodePlayItem } from "./dto/episode-play-item";
import { EpisodeListItem } from "./dto/episode-list-item";

export class EpisodeMapper {
  static toManagementItem(e: Episode): EpisodeManagementItem {
    return {
      id: e.episodeid,
      title: e.title,
      coverUrl: e.coverUrl,
      publishDate: e.publishAt,
      status: e.status === "PUBLISHED" ? Status.PUBLISHED : Status.REVIEWING,
      access: e.isExclusive ? Access.MEMBER : Access.FREE,
      stats: {
        likes: 0,
        plays: 0,
        favorites: 0,
        shares: 0,
        comments: 0,
      },
      // duration: e.duration.toString(),
      duration: "6",
    };
  }

  static toPlayItem(e: Episode): EpisodePlayItem {
    return {
      id: e.episodeid,
      title: e.title,
      description: e.description,
      audioUrl: e.audioUrl,
      coverUrl: e.coverUrl,
      duration: e.duration,
    };
  }

  static toListItem(e: Episode): EpisodeListItem {
    return {
      id: e.episodeid,
      title: e.title,
      coverUrl: e.coverUrl,
      publishedAt: e.publishAt ? e.publishAt : null,
    };
  }
}
