"use client";

import React, { useActionState, useEffect, useState } from "react";
import { TagSelector } from "@/components/admin/tags/tag-selector";
import PodcastSelecter from "@/components/admin/episodes/podcastSelecter";
import { CheckIcon, ClockIcon } from "@heroicons/react/24/outline";
import { updateEpisodeAction } from "@/lib/actions";
import { redirect } from "next/navigation";
import { Tag } from "@/core/tag/tag.entity";
import { Podcast } from "@/core/podcast/podcast.entity";
import { formatDate } from "@/lib/tools";
import { EpisodeEditItem } from "@/core/episode/dto/episode-edit-item";
import Link from "next/link";
import { EditEpisodeState } from "@/app/types/podcast";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export default function EpisodeEditForm({
  episode,
}: {
  episode: EpisodeEditItem;
}) {
  const [title, setTitle] = useState<string>(episode.title); // 标题
  const [description, setDescription] = useState<string>(episode.description); // 描述
  const [audioFileName] = useState<string>(episode.audioFileName!); // 音频文件名
  const [audioUrl] = useState<string>(episode.audioUrl); // 音频文件url
  const [publishStatus, setPublishStatus] = useState(episode.status); // 发布状态,已发布：paid，审核中：pending
  const [isExclusive, setIsExclusive] = useState(episode.isExclusive); // 是否付费
  const [publishDate, setPublishDate] = useState<string>(episode.publishAt); // 发布时间
  const [selectedTags, setSelectedTags] = useState<string[]>(
    (episode.tags || []).map((item) => item.tag.tagid),
  ); // 选中的标签
  const [tags, setTags] = useState<Tag[]>([]); // 标签列表
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [podcastId, setPodcastId] = useState(episode.podcastid); // 播客id
  console.log("edit episode", episode);

  // 播客选择回调函数
  const handlePodcastSelect = (podcastId: string) => {
    setPodcastId(podcastId);
  };

  // 使用 useEffect 获取标签数据、播客数据
  useEffect(() => {
    // 监听页面离开事件
    const fetchTagsData = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/tag/list`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch tags");
        }
        const data = await res.json();
        setTags(data);
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };
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
    fetchTagsData();
    fetchPodcastData();
  }, []);

  const initialState: EditEpisodeState = {
    errors: {
      title: "",
      description: "",
    },
    message: null,
  };

  // 修改 useActionState 调用为：
  const [state, action, isPending] = useActionState<EditEpisodeState, FormData>(
    async (state: EditEpisodeState, formData: FormData) =>
      updateEpisodeAction(state, episode.episodeid, formData),
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
          <div className="w-full bg-base-200 p-4 rounded-lg mb-2 border border-base-300">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-base-content/70">
                已上传: {audioFileName}
              </span>
            </div>
            <audio controls src={audioUrl} className="w-full" />
          </div>
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
            availableTags={tags}
            selectedTagIds={selectedTags}
            onChange={setSelectedTags}
            allowTypes={["EPISODE", "UNIVERSAL"]}
            maxSelected={5}
          />
          {/* 添加隐藏字段来传递标签 */}
          {selectedTags.map((tagId) => (
            <input key={tagId} type="hidden" name="tags" value={tagId} />
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
                  name="status"
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
                  name="status"
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
            value={formatDate(publishDate)}
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
            currentPodcastId={podcastId}
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

        <div className="divider"></div>
        <div className="flex justify-start gap-4 pb-8 pt-4">
          <Link href="/admin/episodes" className="btn btn-outline w-32">
            取消
          </Link>
          <button
            className="btn btn-primary w-32"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "更新中..." : "立即更新"}
          </button>
        </div>

        {/* 显示错误信息 */}
        {state?.message &&
          state.message !== "redirect:/admin/episodes/update-info-success" && (
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
    </>
  );
}
