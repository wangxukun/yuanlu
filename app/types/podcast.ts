// 定义接受上传字幕的接口
import { episodeRepository } from "@/core/episode/episode.repository";

export interface UploadSubtitlesResponse {
  status: number;
  message: string;
  subtitleUrl: string;
  subtitleFileName: string;
}

// 定义已上传文件的接口
export interface UploadedSubtitleFile {
  language: string;
  fileName: string;
  response: UploadSubtitlesResponse;
}

// 定义创建剧集状态接口
export type EpisodeState = {
  errors?: {
    title: string;
    description: string;
    audioFileName: string;
    podcastId: string;
    coverFileName: string;
  };
  message?: string | null;
};

// 定义修改剧集状态接口
export type EditEpisodeState = {
  errors?: {
    title: string;
    description: string;
  };
  status?: number;
  message?: string | null;
};

export interface EditEpisodeResponse {
  success: boolean;
  message: string | null;
  status: number;
}

// 提取episodeRepository update函数的返回类型
export type UpdateEpisodeResult = Awaited<
  ReturnType<(typeof episodeRepository)["update"]>
>;

// 提取episodeRepository updateSubtitleEn函数的返回类型
export type UpdateEpisodeSubtitleEnResult = Awaited<
  ReturnType<(typeof episodeRepository)["updateSubtitleEn"]>
>;

// 提取episodeRepository updateSubtitleZh函数的返回类型
export type UpdateEpisodeSubtitleZhResult = Awaited<
  ReturnType<(typeof episodeRepository)["updateSubtitleZh"]>
>;

// 提取episodeRepository delete函数的返回类型
export type DeleteEpisodeResult = Awaited<
  ReturnType<(typeof episodeRepository)["delete"]>
>;
