"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { createPodcast, PodcastState } from "@/lib/actions";
import { redirect } from "next/navigation";
import { TagSelector } from "@/components/dashboard/tags/tag-selector";
import UploadCover, {
  UploadCoverResponse,
} from "@/components/dashboard/episodes/uploadCover";
import { Tag } from "@/core/tag/tag.entity";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
export default function PodcastForm() {
  const [coverFileName, setCoverFileName] = useState<string>(""); // 封面文件名
  const [coverUrl, setCoverUrl] = useState<string>(""); // 封面文件url
  const [podcastName, setPodcastName] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isEditorPick, setIsEditorPick] = useState(false);

  const coverApi = "/api/podcast/upload-podcast-cover";

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
      coverUrl: "",
      coverFileName: "",
      platform: "",
    },
    message: null,
  };

  /**
   * state: 存储上一次action执行的返回值
   * formAction: 创建的异步函数,传给 <form action={...}> 的函数
   * isPending: 表示当前 action 是否正在执行
   */
  const [state, action, isPending] = useActionState<PodcastState, FormData>(
    createPodcast, // 表单提交时自动执行的异步函数
    initialState, // 初始状态
  );

  // 封面文件上传回调函数
  const handleUploadCoverComplete = (response: UploadCoverResponse) => {
    setCoverFileName(response.coverFileName);
    setCoverUrl(response.coverUrl);
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
    <form action={action} className="space-y-2">
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

      {/* 播客名称 */}
      <div className="flex flex-row">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-red-500">*</span>
          <span className="font-semibold">标题</span>
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
        <div className="flex items-center gap-2 mb-2">
          <span className="text-red-500">*</span>
          <span className="font-semibold">平台</span>
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

      {/* 标签 */}
      <div className="flex flex-row">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-red-500">*</span>
          <span className="font-semibold">标签</span>
        </div>
        <TagSelector
          availableTags={tags}
          selectedTagIds={selectedTags}
          onChange={setSelectedTags}
          allowTypes={["PODCAST", "UNIVERSAL"]}
          maxSelected={5}
        />
        {/* 添加隐藏字段来传递标签 */}
        {selectedTags.map((tagId) => (
          <input key={tagId} type="hidden" name="tags" value={tagId} />
        ))}
      </div>

      {/* 播客描述 */}
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
          className="textarea textarea-success flex-1 m-6"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      {/* 是否推荐 */}
      <div className="flex flex-row">
        <div className="flex items-center justify-center m-6 ml-3">
          <span className="font-semibold">推荐</span>
        </div>
        <div className="flex items-center ml-4">
          <input
            id="isEditorPick"
            name="isEditorPick"
            type="checkbox"
            checked={isEditorPick}
            onChange={(e) => setIsEditorPick(e.target.checked)}
            className="checkbox checkbox-neutral"
          />
          <label
            htmlFor="isEditorPick"
            className="ml-2 flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
          >
            是否推荐
          </label>
        </div>
      </div>

      <div className="divider"></div>
      <div className="flex justify-start gap-4 pb-8 pt-4">
        <Link href="/dashboard/podcasts" className="btn btn-outline w-32">
          取消
        </Link>
        <Button
          className="btn btn-primary w-32"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "提交中..." : "提交"}
        </Button>
      </div>

      {/* 显示错误信息 */}
      {state?.message &&
        state.message !== "redirect:/dashboard/podcasts/create-success" && (
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
  );
}
