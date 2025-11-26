"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/button";
import {
  PhotoIcon,
  MicrophoneIcon,
  QueueListIcon,
  ClockIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { TagSelector } from "@/components/dashboard/tags/tag-selector";
import { Episode } from "@/core/episode/episode.entity";
import { Tag } from "@/core/tag/tag.entity";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export default function EpisodeEditForm({ episode }: { episode: Episode }) {
  const [uploadedFiles, setUploadedFiles] = useState<{
    coverUrl?: string;
    coverFileName?: string;
    coverMessage?: string;
    audioUrl?: string;
    audioFileName?: string;
    audioMessage?: string;
    subtitleEnUrl?: string;
    subtitleEnFileName?: string;
    subtitleEnMessage?: string;
    subtitleZhUrl?: string;
    subtitleZhFileName?: string;
    subtitleZhMessage?: string;
  }>({
    coverUrl: episode.coverUrl,
    coverFileName: episode.coverFileName,
    audioUrl: episode.audioUrl,
    audioFileName: episode.audioFileName,
    subtitleEnUrl: episode.subtitleEnUrl || undefined,
    subtitleEnFileName: episode.subtitleEnFileName || undefined,
    subtitleZhUrl: episode.subtitleZhUrl || undefined,
    subtitleZhFileName: episode.subtitleZhFileName || undefined,
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(episode.coverUrl);
  const [podcastId] = useState(episode.podcast.podcastid);
  const [episodeTitle, setEpisodeTitle] = useState(episode.title);
  const [duration, setDuration] = useState(episode.duration.toString());
  const [description, setDescription] = useState(episode.description);
  const [audioUrl, setAudioUrl] = useState(episode.audioUrl);
  const [publishStatus, setPublishStatus] = useState(episode.status);
  const [isExclusive, setIsExclusive] = useState(episode.isExclusive);
  const [publishDate, setPublishDate] = useState(
    new Date(episode.publishAt).toISOString().split("T")[0],
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    episode.tags?.map((tag) => tag.tagid) || [],
  );
  const [tags, setTags] = useState<Tag[]>([]);
  const router = useRouter();

  // 使用 useEffect 获取标签数据
  useEffect(() => {
    const fetchData = async () => {
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
    fetchData();
  }, []);

  // 异步封面文件上传
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      // 将文件进行上传
      try {
        const formData = new FormData();
        formData.append("cover", file);
        const response = await fetch("/api/podcast/upload-episode-cover", {
          method: "POST",
          body: formData,
        } as RequestInit);
        const { coverUrl, coverFileName, message } = await response.json();
        setUploadedFiles((prev) => ({
          ...prev,
          coverUrl,
          coverFileName,
          coverMessage: message,
        }));
      } catch (error) {
        console.error("上传封面图片失败", error);
      }
    }
  };

  // 音频文件上传
  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioUrl(URL.createObjectURL(file));
      // 将文件进行上传
      try {
        const formData = new FormData();
        formData.append("audio", file);
        const response = await fetch("/api/podcast/upload-episode-audio", {
          method: "POST",
          body: formData,
        } as RequestInit);
        const { audioUrl, audioFileName, message } = await response.json();
        setUploadedFiles((prev) => ({
          ...prev,
          audioUrl,
          audioFileName,
          audioMessage: message,
        }));
      } catch (error) {
        console.error("上传音频文件失败", error);
      }
    }
  };

  // 中英文字幕上传
  const handleEnChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 将文件进行上传
      try {
        const formData = new FormData();
        formData.append("subtitle", file);
        const response = await fetch("/api/podcast/upload-episode-subtitle", {
          method: "POST",
          body: formData,
        } as RequestInit);
        const { subtitleUrl, subtitleFileName, message } =
          await response.json();
        setUploadedFiles((prev) => ({
          ...prev,
          subtitleEnUrl: subtitleUrl,
          subtitleEnFileName: subtitleFileName,
          subtitleEnMessage: message,
        }));
      } catch (error) {
        console.error("上传字幕文件失败", error);
      }
    }
  };

  // 中文字幕上传
  const handleZhChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 将文件进行上传
      try {
        const formData = new FormData();
        formData.append("subtitle", file);
        const response = await fetch("/api/podcast/upload-episode-subtitle", {
          method: "POST",
          body: formData,
        } as RequestInit);
        const { subtitleUrl, subtitleFileName, message } =
          await response.json();
        setUploadedFiles((prev) => ({
          ...prev,
          subtitleZhUrl: subtitleUrl,
          subtitleZhFileName: subtitleFileName,
          subtitleZhMessage: message,
        }));
      } catch (error) {
        console.error("上传字幕文件失败", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("episodeid", episode.episodeid);
    formData.append("podcastid", podcastId);
    formData.append("episodeTitle", episodeTitle);
    formData.append("coverUrl", uploadedFiles?.coverUrl || episode.coverUrl);
    formData.append(
      "coverFileName",
      uploadedFiles?.coverFileName || episode.coverFileName || "",
    );
    formData.append("audioUrl", uploadedFiles?.audioUrl || episode.audioUrl);
    formData.append(
      "audioFileName",
      uploadedFiles?.audioFileName || episode.audioFileName || "",
    );
    formData.append("duration", duration);
    formData.append("publishDate", publishDate);
    formData.append(
      "subtitleEnUrl",
      uploadedFiles?.subtitleEnUrl || episode.subtitleEnUrl || "",
    );
    formData.append(
      "subtitleEnFileName",
      uploadedFiles?.subtitleEnFileName || episode.subtitleEnFileName || "",
    );
    formData.append(
      "subtitleZhUrl",
      uploadedFiles?.subtitleZhUrl || episode.subtitleZhUrl || "",
    );
    formData.append(
      "subtitleZhFileName",
      uploadedFiles?.subtitleZhFileName || episode.subtitleZhFileName || "",
    );
    formData.append("description", description);
    formData.append("publishStatus", publishStatus);
    formData.append("isExclusive", isExclusive.toString());
    // 将 selectedTags 添加到 FormData 中
    selectedTags.forEach((tagId) => {
      formData.append("tags", tagId);
    });

    try {
      const response = await fetch("/api/episode/update", {
        method: "PUT",
        body: formData,
      } as RequestInit);

      if (response.ok) {
        await router.push("/dashboard/episodes");
      } else {
        console.log("剧集更新失败");
      }
    } catch (error) {
      console.error("剧集更新失败: ", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* 剧集标题 */}
        <div className="mb-4">
          <label
            htmlFor="episodeTitle"
            className="mb-2 block text-sm font-medium"
          >
            剧集标题
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="episodeTitle"
                name="episodeTitle"
                type="text"
                placeholder="剧集标题"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                value={episodeTitle}
                onChange={(e) => setEpisodeTitle(e.target.value)}
                required
              />
              <MicrophoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
        </div>

        {/* 封面图片 */}
        <div className="mb-4">
          <label htmlFor="cover" className="mb-2 block text-sm font-medium">
            封面图片
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="cover"
                name="cover"
                type="file"
                accept="image/*"
                placeholder="封面图片"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                onChange={handleCoverChange}
              />
              <PhotoIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {previewUrl && (
              <div className="mt-2">
                <img
                  src={previewUrl}
                  alt="封面预览"
                  className="h-32 w-32 object-cover rounded-md"
                />
              </div>
            )}
            <span>{uploadedFiles?.coverMessage}</span>
          </div>
        </div>

        {/* 音频文件 */}
        <div className="mb-4">
          <label htmlFor="audio" className="mb-2 block text-sm font-medium">
            上传音频文件
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="audio"
                name="audio"
                type="file"
                accept="audio/*"
                className="peer block w-full rounded-md border py-2 border-gray-200 pl-10 text-sm outline-2 placeholder:text-gray-500"
                onChange={handleAudioChange}
              />
              <MicrophoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
          {audioUrl && (
            <div className="mt-2">
              <audio controls src={audioUrl} className="w-full"></audio>
            </div>
          )}
          <span>{uploadedFiles?.audioMessage}</span>
        </div>

        {/* 音频时长 */}
        <div className="mb-4">
          <label htmlFor="duration" className="mb-2 block text-sm font-medium">
            音频时长 (秒)
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="duration"
                name="duration"
                type="text"
                placeholder="音频时长"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
              <MicrophoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
        </div>

        {/* 发布日期 */}
        <div className="mb-4">
          <label
            htmlFor="publishDate"
            className="mb-2 block text-sm font-medium"
          >
            发布日期
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="publishDate"
                name="publishDate"
                type="date"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                required
              />
              <ClockIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
        </div>

        {/* 英文字幕 */}
        <div className="mb-4">
          <label
            htmlFor="subtitleEn"
            className="mb-2 block text-sm font-medium"
          >
            英文字幕
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="subtitleEn"
                name="subtitleEN"
                type="file"
                accept=".srt,.vtt"
                className="peer block w-full rounded-md border py-2 border-gray-200 pl-10 text-sm outline-2 placeholder:text-gray-500"
                onChange={handleEnChange}
              />
              <MicrophoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
          <span>{uploadedFiles?.subtitleEnMessage}</span>
        </div>

        {/* 中文字幕 */}
        <div className="mb-4">
          <label
            htmlFor="subtitleZh"
            className="mb-2 block text-sm font-medium"
          >
            中文字幕
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="subtitleZh"
                name="subtitleZh"
                type="file"
                accept=".srt,.vtt"
                className="peer block w-full rounded-md border py-2 border-gray-200 pl-10 text-sm outline-2 placeholder:text-gray-500"
                onChange={handleZhChange}
              />
              <MicrophoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
          <span>{uploadedFiles?.subtitleZhMessage}</span>
        </div>

        {/* 发布状态 */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">发布状态</legend>
          <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3">
            <div className="flex gap-4">
              <div className="flex items-center">
                <input
                  id="pending"
                  name="status"
                  type="radio"
                  checked={publishStatus === "pending"}
                  value="pending"
                  onChange={(e) => setPublishStatus(e.target.value)}
                  className="text-white-600 h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 focus:ring-2"
                />
                <label
                  htmlFor="pending"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600"
                >
                  待发布 <ClockIcon className="h-4 w-4" />
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="paid"
                  name="status"
                  type="radio"
                  checked={publishStatus === "paid"}
                  value="paid"
                  onChange={(e) => setPublishStatus(e.target.value)}
                  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                />
                <label
                  htmlFor="paid"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white"
                >
                  发布 <CheckIcon className="h-4 w-4" />
                </label>
              </div>
            </div>
          </div>
        </fieldset>

        {/* 是否需要订阅 */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">付费订阅</legend>
          <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3">
            <div className="flex gap-4">
              <div className="flex items-center">
                <input
                  id="isExclusive"
                  name="isExclusive"
                  type="checkbox"
                  checked={isExclusive}
                  onChange={(e) => setIsExclusive(e.target.checked)}
                  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                />
                <label
                  htmlFor="isExclusive"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                >
                  需要付费订阅
                </label>
              </div>
            </div>
          </div>
        </fieldset>

        {/* 播客描述 */}
        <div className="mb-4">
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium"
          >
            播客描述
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <textarea
                rows={4}
                cols={50}
                id="description"
                name="description"
                placeholder="播客描述"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <QueueListIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
        </div>

        <TagSelector
          availableTags={tags}
          selectedTagIds={selectedTags}
          onChange={setSelectedTags}
          allowTypes={["EPISODE", "UNIVERSAL"]}
          maxSelected={5}
        />
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/episodes"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          取消
        </Link>
        <Button type="submit">更新剧集</Button>
      </div>
    </form>
  );
}
