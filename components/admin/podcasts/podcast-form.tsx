"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TagSelector } from "@/components/admin/tags/tag-selector";
import UploadCover, {
  UploadCoverResponse,
} from "@/components/admin/episodes/uploadCover";
import { PodcastState } from "@/lib/actions";
import Image from "next/image";
import { ImageIcon, Loader2, AlertCircle } from "lucide-react";

// 定义组件 Props
interface PodcastFormProps {
  initialData?: {
    podcastid?: string;
    title: string;
    description: string | null;
    platform: string | null;
    coverUrl: string;
    coverFileName: string | null;
    isEditorPick: boolean | null;
    tags: string[];
  };
  formAction: (
    prevState: PodcastState,
    formData: FormData,
  ) => Promise<PodcastState>;
  mode: "create" | "edit";
}

export default function PodcastForm({
  initialData,
  formAction,
  mode,
}: PodcastFormProps) {
  // 状态初始化
  const [coverFileName, setCoverFileName] = useState(
    initialData?.coverFileName || "",
  );
  const [coverUrl, setCoverUrl] = useState(initialData?.coverUrl || "");
  const [podcastName, setPodcastName] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [platform, setPlatform] = useState(initialData?.platform || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialData?.tags || [],
  );
  const [isEditorPick, setIsEditorPick] = useState(
    initialData?.isEditorPick || false,
  );

  const coverApi = "/api/podcast/upload-podcast-cover";

  const initialState: PodcastState = {
    message: null,
  };

  const [state, action, isPending] = useActionState(formAction, initialState);

  const handleUploadCoverComplete = (response: UploadCoverResponse) => {
    setCoverFileName(response.coverFileName);
    setCoverUrl(response.coverUrl);
  };

  useEffect(() => {
    if (state?.message?.startsWith("redirect:")) {
      const redirectPath = state.message.split(":")[1];
      redirect(redirectPath);
    }
  }, [state]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 顶部标题区（可选，如果页面已有标题可移除） */}
      <div className="px-8 py-6 border-b border-gray-50">
        <h2 className="text-xl font-bold text-gray-900">
          {mode === "edit" ? "编辑播客信息" : "创建新播客"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {mode === "edit"
            ? "更新现有的播客详细信息和设置"
            : "填写以下信息以发布一个新的英语学习播客合集"}
        </p>
      </div>

      <form action={action} className="p-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：封面与设置 */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase block">
                封面图 <span className="text-red-500">*</span>
              </label>

              <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center text-center hover:border-indigo-300 hover:bg-gray-100/50 transition-all">
                {coverUrl ? (
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-sm mb-4 border border-gray-100">
                    <Image
                      src={coverUrl}
                      alt="Cover Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-white border border-gray-100 flex items-center justify-center mb-4 text-gray-300">
                    <ImageIcon size={48} strokeWidth={1.5} />
                  </div>
                )}

                <div className="w-full">
                  {/* 传递给 UploadCover 的样式可能需要内部调整，或者它是一个简单的按钮 */}
                  <UploadCover
                    onUploadComplete={handleUploadCoverComplete}
                    coverApi={coverApi}
                  />
                </div>

                <p className="text-[10px] text-gray-400 mt-3 font-medium">
                  {mode === "edit"
                    ? "上传新图片将覆盖当前封面"
                    : "支持 JPG/PNG，建议 1000x1000px"}
                </p>
                <input
                  type="hidden"
                  name="coverFileName"
                  value={coverFileName}
                />
                <input type="hidden" name="coverUrl" value={coverUrl} />
              </div>
            </div>
          </div>

          {/* 右侧：主要表单信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 标题与平台 - 双列布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  标题 <span className="text-red-500">*</span>
                </label>
                <input
                  name="podcastName"
                  value={podcastName}
                  onChange={(e) => setPodcastName(e.target.value)}
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-300"
                  placeholder="例如：Business English Pod"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  发布平台
                </label>
                <input
                  name="platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-300"
                  placeholder="例如：BBC, VOA"
                />
              </div>
            </div>

            {/* 标签 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">
                标签
              </label>
              <div className="p-1">
                <TagSelector
                  selectedTags={selectedTags}
                  onChange={setSelectedTags}
                  maxSelected={5}
                />
              </div>
              {selectedTags.map((tagName) => (
                <input
                  key={tagName}
                  type="hidden"
                  name="tags"
                  value={tagName}
                />
              ))}
            </div>

            {/* 简介 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">
                简介
              </label>
              <textarea
                name="description"
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-gray-300"
                placeholder="请详细描述这个播客合集的内容，这有助于用户搜索到它..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* 选项开关 */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-700">编辑推荐</h3>
                <p className="text-xs text-gray-400 mt-0.5">将此合集置顶显示</p>
              </div>
              <input
                name="isEditorPick"
                type="checkbox"
                checked={isEditorPick}
                onChange={(e) => setIsEditorPick(e.target.checked)}
                className="checkbox checkbox-primary checkbox-sm rounded-md"
              />
            </div>
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="pt-6 border-t border-gray-50 flex items-center justify-end gap-3">
          <Link
            href="/admin/podcasts"
            className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all"
          >
            取消
          </Link>
          <button
            disabled={isPending}
            type="submit"
            className="px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "edit" ? "保存更改" : "立即创建"}
          </button>
        </div>

        {/* 错误提示区域 */}
        {state?.message && !state.message.startsWith("redirect:") && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium text-red-600">
              {state.message}
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
