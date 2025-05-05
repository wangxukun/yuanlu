"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import {
  MicrophoneIcon,
  PhotoIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { DeleteCoverBtn } from "@/components/dashboard/buttons";
import { useRouter } from "next/navigation";

type CheckboxValues = {
  podcast: boolean;
  episode: boolean;
  universal: boolean;
};

export default function TagGroupForm() {
  const [uploadedFiles, setUploadedFiles] = useState<{
    coverUrl?: string;
    coverFileName?: string;
    coverMessage?: string;
  }>();
  const [tagGroupName, setTagGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [checkedValues, setCheckedValues] = useState<CheckboxValues>({
    podcast: false,
    episode: false,
    universal: false,
  });
  const router = useRouter();

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
        const response = await fetch("/api/tag-group/upload-tag-group-cover", {
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

  // 处理复选框变化
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setCheckedValues((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("coverUrl", uploadedFiles?.coverUrl || "");
    formData.append("coverFileName", uploadedFiles?.coverFileName || "");
    formData.append("tagGroupName", tagGroupName);
    formData.append("description", description);
    formData.append("sortOrder", sortOrder.toString());
    // 获取选中项数组
    const selected = Object.entries(checkedValues)
      .filter(([value]) => value)
      .map(function ([key]) {
        return key.toUpperCase();
      });
    formData.append("allowedTypes", JSON.stringify(selected));
    try {
      const response = await fetch("/api/tag-group/create", {
        method: "POST",
        body: formData,
      } as RequestInit);

      if (response.ok) {
        console.log("标签组创建成功");
        await router.push("/dashboard/tag-groups/create-success");
      } else {
        console.log("标签组创建失败");
      }
    } catch (error) {
      console.error("标签组创建失败: ", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* tag group name */}
        <div className="mb-4">
          <label
            htmlFor="tagGroupName"
            className="mb-2 block text-sm font-medium"
          >
            标签组名称
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="tagGroupName"
                name="tagGroupName"
                type="text"
                placeholder="标签组名称"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                value={tagGroupName}
                onChange={(e) => setTagGroupName(e.target.value)}
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
            {previewUrl && (
              <DeleteCoverBtn
                coverFileName={uploadedFiles?.coverFileName || ""}
                OnHideCover={() => {
                  setPreviewUrl(null);
                }}
              />
            )}
          </div>
        </div>

        {/* 排序权重 */}
        <div className="mb-4">
          <label htmlFor="sortOrder" className="mb-2 block text-sm font-medium">
            排序权重
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="sortOrder"
                name="sortOrder"
                type="number"
                placeholder="排序权重"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                required
              />
              <MicrophoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
        </div>

        {/* 可包含类型 */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">包含类型</legend>
          <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3">
            <div className="flex gap-4">
              <div className="flex items-center">
                <input
                  id="podcast"
                  name="podcast"
                  type="checkbox"
                  checked={checkedValues.podcast}
                  onChange={handleCheckboxChange}
                />
                <label htmlFor="podcast" className="ml-2 text-sm font-medium">
                  播客
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="episode"
                  name="episode"
                  type="checkbox"
                  checked={checkedValues.episode}
                  onChange={handleCheckboxChange}
                />
                <label htmlFor="episode" className="ml-2 text-sm font-medium">
                  剧集
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="universal"
                  name="universal"
                  type="checkbox"
                  checked={checkedValues.universal}
                  onChange={handleCheckboxChange}
                />
                <label htmlFor="universal" className="ml-2 text-sm font-medium">
                  通用
                </label>
              </div>
            </div>
          </div>
        </fieldset>

        <div className="mb-4">
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium"
          >
            标签组描述
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <textarea
                rows={4}
                cols={50}
                id="description"
                name="description"
                placeholder="标签组描述"
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
          href="/dashboard/tag-groups"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          取消
        </Link>
        <Button type="submit">创建标签组</Button>
      </div>
    </form>
  );
}
