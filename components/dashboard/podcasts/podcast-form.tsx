"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import {
  PhotoIcon,
  LanguageIcon,
  MicrophoneIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { createPodcast, PodcastState } from "@/app/lib/actions";
import { redirect } from "next/navigation";

export default function PodcastForm() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [podcastName, setPodcastName] = useState("");
  const [description, setDescription] = useState("");
  const [from, setFrom] = useState("");

  const initialState: PodcastState = {
    errors: {
      podcastName: "",
      description: "",
      cover: "",
      coverFileName: "",
      form: "",
    },
    message: null,
  };

  const [state, formAction] = useActionState<PodcastState, FormData>(
    createPodcast,
    initialState,
  );

  // 封面文件上传
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const image = e.target.files?.[0];
    if (image) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(image);
    }
  };

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
    <form action={formAction} className="space-y-3">
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* 播客名称 */}
        <div className="mb-4">
          <label
            htmlFor="podcastName"
            className="mb-2 block text-sm font-medium"
          >
            播客名称
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="podcastName"
                name="podcastName"
                type="text"
                placeholder="播客名称"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                value={podcastName}
                onChange={(e) => setPodcastName(e.target.value)}
                required
              />
              <MicrophoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
        </div>

        {/* 发布平台 */}
        <div className="mb-4">
          <label htmlFor="from" className="mb-2 block text-sm font-medium">
            发布平台
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="from"
                name="from"
                type="text"
                placeholder="发布平台"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
              <LanguageIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
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
          </div>
        </div>

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
                rows={8}
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
          href="/dashboard/podcasts"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          取消
        </Link>
        <Button type="submit">创建播客</Button>
      </div>
      {state.message && <p className="text-red-500">{state.message}</p>}
    </form>
  );
}
