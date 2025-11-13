"use client";

import React, {
  startTransition,
  useActionState,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { QueueListIcon } from "@heroicons/react/24/outline";
import { createPodcast, PodcastState } from "@/app/lib/actions";
import { redirect } from "next/navigation";
import { TagSelector } from "@/components/dashboard/tags/tag-selector";
import { Tag } from "@/app/types/podcast";
import UploadCover, {
  UploadCoverResponse,
} from "@/components/dashboard/episodes/uploadCover";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
export default function PodcastForm() {
  const [coverFileName, setCoverFileName] = useState<string>(); // 封面文件名
  const [coverUrl, setCoverUrl] = useState<string>(); // 封面文件url
  const [podcastName, setPodcastName] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isEditorPick, setIsEditorPick] = useState(false);

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

  // 封面文件上传回调函数
  const handleUploadCoverComplete = (response: UploadCoverResponse) => {
    setCoverFileName(response.coverFileName);
    setCoverUrl(response.coverUrl);
    console.log("coverFileName:", coverFileName);
    console.log("coverUrl:", coverUrl);
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
      <div className="rounded-md bg-base-200 p-4 md:p-6">
        {/* 播客名称 */}
        <div className="flex flex-row">
          <div className="flex items-center justify-center mr-4">
            <span className="text-red-500">*</span>
            <span>标题</span>
          </div>
          <input
            id="podcastName"
            name="podcastName"
            value={podcastName}
            onChange={(e) => setPodcastName(e.target.value)}
            type="text"
            className="input input-success flex-1 m-6"
            placeholder="请输入标题"
          />
        </div>

        {/* 发布平台 */}
        <div className="flex flex-row">
          <div className="flex items-center justify-center mr-4">
            <span className="text-red-500">*</span>
            <span>平台</span>
          </div>
          <input
            id="platform"
            name="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            type="text"
            className="input input-success flex-1 m-6"
            placeholder="请输入发布平台"
          />
        </div>

        {/* 封面图片 */}
        <div className="flex flex-row">
          <div className="flex items-center justify-center mr-4">
            <span className="text-red-500">*</span>
            <span>封面</span>
          </div>
          <UploadCover onUploadComplete={handleUploadCoverComplete} />
        </div>

        {/* 是否推荐 */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">编辑推荐</legend>
          <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3 border-neutral border-[2px]">
            <div className="flex gap-4">
              <div className="flex items-center">
                <input
                  id="isExclusive"
                  name="isExclusive"
                  type="checkbox"
                  checked={isEditorPick}
                  onChange={(e) => setIsEditorPick(e.target.checked)}
                  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                />
                <label
                  htmlFor="isExclusive"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                >
                  {/* <CheckIcon className="h-4 w-4" />*/}推荐
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
