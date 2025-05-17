"use client";

import React, {
  startTransition,
  useActionState,
  useEffect,
  useState,
} from "react";
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
import { TagSelector } from "@/components/dashboard/tags/tag-selector";
import { Tag } from "@/app/types/podcast";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
export default function PodcastForm() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [podcastName, setPodcastName] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

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

  const initialState: PodcastState = {
    errors: {
      podcastName: "",
      description: "",
      cover: "",
      coverFileName: "",
      platform: "",
    },
    message: null,
  };

  const [state, formAction] = useActionState<PodcastState, FormData>(
    createPodcast,
    initialState,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // 阻止默认表单提交行为
    // 创建 FormData 对象
    const formData = new FormData(e.currentTarget);
    // 将 selectedTags 添加到 FormData 中
    console.log("selectedTags:", selectedTags);
    selectedTags.forEach((tagId) => {
      formData.append("tags", tagId);
    });
    console.log("FormData:", Array.from(formData.entries())); // 打印 FormData
    // 使用 startTransition 触发异步操作
    startTransition(() => {
      formAction(formData);
    });
  };

  // 封面文件上传
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const image = e.target.files?.[0];
    if (image) {
      if (image.size > 1024 * 1024 * 1) {
        return alert("图片大小不能超过1MB");
      }
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
    <form onSubmit={handleSubmit} className="space-y-3">
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
          <label htmlFor="platform" className="mb-2 block text-sm font-medium">
            发布平台
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="platform"
                name="platform"
                type="text"
                placeholder="发布平台"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
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
        <TagSelector
          availableTags={tags}
          selectedTagIds={selectedTags}
          onChange={setSelectedTags}
          allowTypes={["PODCAST", "UNIVERSAL"]} // 可根据上下文切换
          maxSelected={5}
        />
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
