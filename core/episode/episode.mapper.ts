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
import { formatDate, formatTime } from "@/lib/tools";
import { EpisodeEditItem } from "@/core/episode/dto/episode-edit-item";
import {
  EditEpisodeResponse,
  UpdateEpisodeResult,
  UpdateEpisodeSubtitleEnResult,
  UpdateEpisodeSubtitleZhResult,
} from "@/app/types/podcast";
import { EpisodeSubtitles } from "@/core/episode/dto/episode-subtitles";
import { EpisodeOSSItem } from "@/core/episode/dto/episode-oss-item";
import { ActionState } from "@/lib/types";

export class EpisodeMapper {
  /**
   * 返回数据映射管理视图用数据
   * @param e
   */
  static toManagementItem(e: Episode): EpisodeManagementItem {
    console.log("EpisodeMapper.toManagementItem", e);
    return {
      id: e.episodeid,
      title: e.title,
      coverUrl: e.coverUrl,
      publishDate: formatDate(e.publishAt),
      status: e.status === "paid" ? Status.PUBLISHED : Status.REVIEWING,
      access: e.isExclusive ? Access.MEMBER : Access.FREE,
      stats: {
        likes: 0,
        plays: 0,
        favorites: 0,
        shares: 0,
        comments: 0,
      },
      duration: formatTime(e.duration),
    };
  }

  /**
   * 返回数据映射编辑视图用数据
   * @param e
   */
  static toEditItem(e: Episode): EpisodeEditItem {
    return {
      episodeid: e.episodeid,
      title: e.title,
      description: e.description,
      audioFileName: e.audioFileName,
      audioUrl: e.audioUrl,
      podcastid: e.podcastid,
      isExclusive: e.isExclusive,
      publishAt: e.publishAt,
      status: e.status,
      tags: e.tags,
    };
  }

  /**
   * episode更新返回状态
   * @param e
   */
  static toUpdateState(e: UpdateEpisodeResult): EditEpisodeResponse {
    // 从Prisma Client返回的对象提取实际值
    const title = "title" in e ? e.title : null;
    const description = "description" in e ? e.description : null;
    return {
      success: title && description ? true : false,
      message: title && description ? "更新成功" : "更新失败",
      status: title && description ? 200 : 400,
    };
  }

  /**
   * 返回数据映射字幕相关信息
   * @param e
   */
  static toSubtitles(e: Episode): EpisodeSubtitles {
    return {
      episodeId: e.episodeid,
      title: e.title,
      coverUrl: e.coverUrl,
      coverFileName: e.coverFileName,
      subtitleEnUrl: e.subtitleEnUrl,
      subtitleEnFileName: e.subtitleEnFileName,
      subtitleZhUrl: e.subtitleZhUrl,
      subtitleZhFileName: e.subtitleZhFileName,
    };
  }

  static toUpdateSubtitleEnState(
    e: UpdateEpisodeSubtitleEnResult,
  ): EditEpisodeResponse {
    // 从Prisma Client返回的对象提取实际值
    const subtitleEnUrl = "subtitleEnUrl" in e ? e.subtitleEnUrl : null;
    const subtitleEnFileName =
      "subtitleEnFileName" in e ? e.subtitleEnFileName : null;
    return {
      success: !!subtitleEnUrl && !!subtitleEnFileName,
      message: subtitleEnUrl && subtitleEnFileName ? "更新成功" : "更新失败",
      status: subtitleEnUrl && subtitleEnFileName ? 200 : 400,
    };
  }

  static toUpdateSubtitleZhState(
    e: UpdateEpisodeSubtitleZhResult,
  ): EditEpisodeResponse {
    // 从Prisma Client返回的对象提取实际值
    const subtitleZhUrl = "subtitleZhUrl" in e ? e.subtitleZhUrl : null;
    const subtitleZhFileName =
      "subtitleZhFileName" in e ? e.subtitleZhFileName : null;
    return {
      success: !!subtitleZhUrl && !!subtitleZhFileName,
      message: subtitleZhUrl && subtitleZhFileName ? "更新成功" : "更新失败",
      status: subtitleZhUrl && subtitleZhFileName ? 200 : 400,
    };
  }

  /**
   * episode删除返回状态
   * @param e
   */
  static toDeleteState(): ActionState {
    return {
      success: true,
      message: "删除成功",
    };
  }

  static toEpisodeOSSFiles(e: Episode): EpisodeOSSItem {
    return {
      audioFileName: e.audioFileName,
      coverFileName: e.coverFileName,
      subtitleEnFileName: e.subtitleEnFileName,
      subtitleZhFileName: e.subtitleZhFileName,
    };
  }
}
