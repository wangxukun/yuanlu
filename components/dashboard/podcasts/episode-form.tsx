"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import {
  PhotoIcon,
  MicrophoneIcon,
  QueueListIcon,
  UserCircleIcon,
  ClockIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { createEpisode, EpisodeState } from "@/app/lib/actions";
import { PodcastField } from "@/app/lib/definitions";

export default function EpisodeForm({
  podcasts,
}: {
  podcasts: PodcastField[];
}) {
  const [uploadedFiles, setUploadedFiles] = useState<{
    coverUrl?: string;
    coverFileName?: string;
    coverMessage?: string;
    audioUrl?: string;
    audioFileName?: string;
    audioMessage?: string;
    subtitleUrl?: string;
    subtitleFileName?: string;
    subtitleMessage?: string;
  }>();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [audioUrl, setAudioUrl] = useState<string>();

  const initialState: EpisodeState = {
    message: null,
    status: 0,
  };

  const [state, formAction] = useActionState<EpisodeState, FormData>(
    createEpisode,
    initialState,
  );

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
        });
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
        });
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
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 将文件进行上传
      try {
        const formData = new FormData();
        formData.append("subtitle", file);
        const response = await fetch("/api/podcast/upload-episode-subtitle", {
          method: "POST",
          body: formData,
        });
        const { subtitleUrl, subtitleFileName, message } =
          await response.json();
        setUploadedFiles((prev) => ({
          ...prev,
          subtitleUrl: subtitleUrl,
          subtitleFileName: subtitleFileName,
          subtitleMessage: message,
        }));
      } catch (error) {
        console.error("上传音频文件失败", error);
      }
    }
  };

  return (
    <form action={formAction} className="space-y-3">
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* 播客名称 */}
        <div className="mb-4">
          <label htmlFor="podcastid" className="mb-2 block text-sm font-medium">
            选择播客
          </label>
          <div className="relative">
            <select
              id="podcastid"
              name="podcastid"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              defaultValue=""
              aria-describedby="customer-error"
            >
              <option value="" disabled>
                选择一个播客
              </option>
              {podcasts.map((podcast) => (
                <option key={podcast.categoryid} value={podcast.categoryid}>
                  {podcast.title}
                </option>
              ))}
            </select>
            <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
          </div>
        </div>
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
                required
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
            音频时长
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
                onChange={handleChange}
              />
              <MicrophoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
          <span>{uploadedFiles?.subtitleMessage}</span>
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
                onChange={handleChange}
              />
              <MicrophoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
          <span>{uploadedFiles?.subtitleMessage}</span>
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
                  value="pending"
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
                  value="paid"
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
          <legend className="mb-2 block text-sm font-medium">
            是否需要订阅
          </legend>
          <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3">
            <div className="flex gap-4">
              <div className="flex items-center">
                <input
                  id="isExclusive"
                  name="isExclusive"
                  type="checkbox"
                  value="isExclusive"
                  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                />
                <label
                  htmlFor="isExclusive"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white"
                >
                  订阅版 <CheckIcon className="h-4 w-4" />
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
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/episodes"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          取消
        </Link>
        <Button type="submit">发布播客剧集</Button>
      </div>
      {state.message && (
        <p className="mt-4 text-sm text-red-500">{state.message}</p>
      )}
    </form>
  );
}
