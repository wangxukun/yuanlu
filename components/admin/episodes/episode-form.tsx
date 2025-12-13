"use client";

import UploadAudio, {
  UploadFileResponse,
} from "@/components/admin/episodes/uploadAudio";
import UploadCover, {
  UploadCoverResponse,
} from "@/components/admin/episodes/uploadCover";
import React, { useActionState, useEffect, useState } from "react";
import { TagSelector } from "@/components/admin/tags/tag-selector";
import PodcastSelecter from "@/components/admin/episodes/podcastSelecter";
import {
  CheckIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import UploadSubtitles from "@/components/admin/episodes/uploadSubtitles";
import { UploadedSubtitleFile } from "@/app/types/podcast";
import { useLeaveConfirm } from "@/components/LeaveConfirmProvider";
import { createEpisode, deleteFile, EpisodeState } from "@/lib/actions";
import { redirect } from "next/navigation";
import { Podcast } from "@/core/podcast/podcast.entity";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export default function EpisodeForm() {
  const [title, setTitle] = useState<string>(""); // 标题
  const [description, setDescription] = useState<string>(""); // 描述
  const [audioDuration, setAudioDuration] = useState<number>(0); // 音频时长
  const [audioFileName, setAudioFileName] = useState<string>(""); // 音频文件名
  const [coverFileName, setCoverFileName] = useState<string>(""); // 封面文件名
  const [subtitleEnFileName, setSubtitleEnFileName] = useState<string>(""); // 英文字幕文件名
  const [subtitleZhFileName, setSubtitleZhFileName] = useState<string>(""); // 中文字幕文件名
  const [audioUrl, setAudioUrl] = useState<string>(""); // 音频文件url
  const [coverUrl, setCoverUrl] = useState<string>(""); // 封面文件url
  const [subtitleEnUrl, setSubtitleEnUrl] = useState<string>(""); // 英文字幕文件url
  const [subtitleZhUrl, setSubtitleZhUrl] = useState<string>(""); // 中文字幕文件url
  const [publishStatus, setPublishStatus] = useState("paid"); // 发布状态,已发布：paid，审核中：pending
  const [isExclusive, setIsExclusive] = useState(false); // 是否付费
  const [publishDate, setPublishDate] = useState<string>(""); // 发布时间
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 选中的标签
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [podcastId, setPodcastId] = useState(""); // 播客id
  const { setNeedConfirm } = useLeaveConfirm();

  const coverApi = "/api/podcast/upload-episode-cover";

  // 音频文件上传回调函数
  const handleUploadAudioComplete = (
    response: UploadFileResponse,
    audioDuration: number,
  ) => {
    setAudioFileName(response.audioFileName);
    setAudioUrl(response.audioUrl);
    setAudioDuration(audioDuration);
  };
  // 封面文件上传回调函数
  const handleUploadCoverComplete = (response: UploadCoverResponse) => {
    setCoverFileName(response.coverFileName);
    setCoverUrl(response.coverUrl);
  };
  // 播客选择回调函数
  const handlePodcastSelect = (podcastId: string) => {
    setPodcastId(podcastId);
  };

  // 音频字幕文件上传回调函数
  const handleSubtitlesUploadComplete = (response: UploadedSubtitleFile[]) => {
    // 清空字幕文件数据
    setSubtitleEnFileName("");
    setSubtitleZhFileName("");
    setSubtitleEnUrl("");
    setSubtitleZhUrl("");
    if (response.length > 0) {
      for (const file of response) {
        console.log("字幕文件数据:", file);
        if (file.language === "英语") {
          setSubtitleEnFileName(file.response.subtitleFileName);
          setSubtitleEnUrl(file.response.subtitleUrl);
        } else {
          setSubtitleZhFileName(file.response.subtitleFileName);
          setSubtitleZhUrl(file.response.subtitleUrl);
        }
      }
    }
  };

  // 使用 useEffect 获取标签数据、播客数据
  useEffect(() => {
    // 监听页面离开事件
    setNeedConfirm(true);
    const fetchPodcastData = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/podcast/list`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch podcasts");
        }
        const data = await res.json();
        setPodcasts(data);
      } catch (error) {
        console.error("Error fetching podcasts:", error);
      }
    };
    fetchPodcastData();
  }, []);

  // 取消按钮点击事件处理函数
  const handleCancel = async () => {
    // 删除已上传的音频文件
    if (audioFileName) {
      try {
        const result = await deleteFile(audioFileName);
        console.log("删除音频文件结果:", result);
      } catch (error) {
        console.error("删除音频文件失败:", error);
      }
    }
    // 删除已上传的封面文件
    if (coverFileName) {
      try {
        const result = await deleteFile(coverFileName);
        console.log("删除封面文件结果:", result);
      } catch (error) {
        console.error("删除封面文件失败:", error);
      }
    }
    // 删除已上传的英文字幕文件
    if (subtitleEnFileName) {
      try {
        const result = await deleteFile(subtitleEnFileName);
        console.log("删除英文字幕文件结果:", result);
      } catch (error) {
        console.error("删除英文字幕文件失败:", error);
      }
    }
    // 删除已上传的中文字幕文件
    if (subtitleZhFileName) {
      try {
        const result = await deleteFile(subtitleZhFileName);
        console.log("删除中文字幕文件结果:", result);
      } catch (error) {
        console.error("删除中文字幕文件失败:", error);
      }
    }
    // 重置所有状态
    setAudioFileName("");
    setAudioUrl("");
    setAudioDuration(0);
    setCoverFileName("");
    setCoverUrl("");
    setSubtitleEnFileName("");
    setSubtitleEnUrl("");
    setSubtitleZhFileName("");
    setSubtitleZhUrl("");
  };

  const initialState: EpisodeState = {
    errors: {
      title: "",
      description: "",
      audioFileName: "",
      podcastId: "",
      coverFileName: "",
    },
    message: null,
  };

  const [state, action, isPending] = useActionState<EpisodeState, FormData>(
    createEpisode,
    initialState,
  );
  // 处理 重定向
  useEffect(() => {
    if (state?.message?.startsWith("redirect:")) {
      if (state.message != null) {
        const redirectPath = state.message.split(":")[1];
        redirect(redirectPath);
      }
    }
  }, [state]);

  return (
    <>
      <form action={action} className="space-y-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500">*</span>
            <span className="font-semibold">音频文件</span>
          </div>
          <UploadAudio onUploadComplete={handleUploadAudioComplete} />
        </div>
        {/* 添加隐藏字段来传递音频信息 */}
        <input type="hidden" name="audioFileName" value={audioFileName} />
        <input type="hidden" name="audioUrl" value={audioUrl} />
        <input type="hidden" name="audioDuration" value={audioDuration} />
        {/* 封面图片 */}
        <div className="flex flex-row">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500">*</span>
            <span className="font-semibold">封面</span>
          </div>
          <UploadCover
            onUploadComplete={handleUploadCoverComplete}
            coverApi={coverApi}
          />
          {/* 添加隐藏字段来传递封面信息 */}
          <input type="hidden" name="coverFileName" value={coverFileName} />
          <input type="hidden" name="coverUrl" value={coverUrl} />
        </div>
        <div className="flex flex-row">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500">*</span>
            <span className="font-semibold">标题</span>
          </div>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            type="text"
            className="input input-success flex-1 ml-6 mr-6"
            placeholder="请输入标题"
          />
        </div>
        <div className="flex flex-row">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500">*</span>
            <span className="font-semibold">标签</span>
          </div>
          <TagSelector
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            maxSelected={10}
          />
          {/* 添加隐藏字段来传递标签 */}
          {selectedTags.map((tagName) => (
            <input key={tagName} type="hidden" name="tags" value={tagName} />
          ))}
        </div>
        <div className="flex flex-row">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500">*</span>
            <span className="font-semibold">简介</span>
          </div>
          <textarea
            rows={4}
            cols={50}
            id="description"
            name="description"
            placeholder="填写更全面的相关信息，让更多人能找到你的音频吧"
            className="textarea textarea-success flex-1 ml-6 mr-6"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-row">
          <div className="flex items-center justify-center mr-4 gap-2">
            <span className="text-red-500">*</span>
            <span className="font-semibold">发布状态</span>
          </div>
          <div className="rounded-md px-[14px] py-3">
            <div className="flex gap-4">
              <div className="flex items-center">
                <input
                  id="paid"
                  name="publishStatus"
                  type="radio"
                  checked={publishStatus === "paid"}
                  value="paid"
                  onChange={(e) => setPublishStatus(e.target.value)}
                  className="radio cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                />
                <label
                  htmlFor="paid"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white"
                >
                  发布 <CheckIcon className="h-4 w-4" />
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="pending"
                  name="publishStatus"
                  type="radio"
                  checked={publishStatus === "pending"}
                  value="pending"
                  onChange={(e) => setPublishStatus(e.target.value)}
                  className="radio text-white-600 cursor-pointer border-gray-300 bg-gray-100 focus:ring-2"
                />
                <label
                  htmlFor="pending"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600"
                >
                  待审核 <ClockIcon className="h-4 w-4" />
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-row">
          <div className="flex items-center justify-center mr-4 gap-2">
            <span className="text-red-500">*</span>
            <span className="font-semibold">发布日期</span>
          </div>
          <input
            id="publishDate"
            name="publishDate"
            type="date"
            className="input input-success w-80 m-6 ml-0"
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-row">
          <div className="flex items-center justify-center mr-4 gap-2">
            <span className="text-red-500">*</span>
            <span className="font-semibold">加入合集</span>
          </div>
          <PodcastSelecter
            currentPodcastId=""
            podcasts={podcasts}
            onValueChange={handlePodcastSelect}
          />
          {/* 添加隐藏字段来传递集合id */}
          <input type="hidden" name="podcastId" value={podcastId} />
        </div>
        <div className="flex flex-row">
          <div className="flex items-center justify-center m-6 ml-3">
            <span className="font-semibold">付费订阅</span>
          </div>
          <div className="flex items-center ml-4">
            <input
              id="isExclusive"
              name="isExclusive"
              type="checkbox"
              checked={isExclusive}
              onChange={(e) => setIsExclusive(e.target.checked)}
              className="checkbox checkbox-neutral"
            />
            <label
              htmlFor="isExclusive"
              className="ml-2 flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
            >
              付费订阅
            </label>
          </div>
        </div>
        <div className="flex flex-row">
          <div className="flex items-center justify-center ml-3">
            <span className="font-semibold">字幕设置</span>
          </div>
          {subtitleEnFileName || subtitleZhFileName ? (
            <div className="flex items-center bg-base-300 rounded pl-4 ml-4">
              <div>
                已上传{subtitleEnFileName ? "【英文】" : ""}
                {subtitleZhFileName ? "【中文】" : ""}字幕
              </div>
              <button
                className="btn btn-link"
                onClick={() => {
                  const modal = document.getElementById(
                    "upload_subtitles_modal",
                  );
                  if (modal) {
                    (modal as HTMLDialogElement).showModal();
                  }
                }}
              >
                修改
              </button>
            </div>
          ) : (
            <div className="flex items-center ml-4">
              <button
                type="button"
                className="btn btn-outline btn-sm gap-2"
                onClick={() => {
                  const modal = document.getElementById(
                    "upload_subtitles_modal",
                  );
                  if (modal) {
                    (modal as HTMLDialogElement).showModal();
                  }
                }}
              >
                <PlusIcon className="size-[1.2em]" />
                上传字幕
              </button>
            </div>
          )}
          {/* 添加隐藏字段来传递字幕信息 */}
          <input
            type="hidden"
            name="subtitleEnFileName"
            value={subtitleEnFileName}
          />
          <input
            type="hidden"
            name="subtitleZhFileName"
            value={subtitleZhFileName}
          />
          <input type="hidden" name="subtitleEnUrl" value={subtitleEnUrl} />
          <input type="hidden" name="subtitleZhUrl" value={subtitleZhUrl} />
        </div>

        <div className="divider"></div>
        <div className="flex justify-start gap-4 pb-8 pt-4">
          <button
            type="button"
            className="btn btn-outline w-32"
            onClick={handleCancel}
          >
            <TrashIcon className="h-4 w-4" />
            清除上传
          </button>
          <button
            className="btn btn-primary w-32"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "发布中..." : "立即发布"}
          </button>
        </div>

        {/* 显示错误信息 */}
        {state?.message &&
          state.message !== "redirect:/admin/episodes/create-success" && (
            <p className="text-red-500">{state.message}</p>
          )}
        {state?.errors &&
          Object.values(state.errors).map(
            (error, index) =>
              error && (
                <p key={index} className="text-red-500">
                  {error}
                </p>
              ),
          )}
      </form>
      {/* 由于form不能嵌套，所有UploadSubtitles组件不能放在上面的form中 */}
      <UploadSubtitles onConfirm={handleSubtitlesUploadComplete} />
    </>
  );
}
