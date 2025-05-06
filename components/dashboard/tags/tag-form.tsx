"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import {
  MicrophoneIcon,
  PhotoIcon,
  QueueListIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { DeleteCoverBtn } from "@/components/dashboard/buttons";
import { useRouter } from "next/navigation";
import { TagType } from "@/app/types/tag";
import { TagGroup } from "@/app/types/podcast";

export default function TagForm({ tagGroups }: { tagGroups: TagGroup[] }) {
  const [uploadedFiles, setUploadedFiles] = useState<{
    coverUrl?: string;
    coverFileName?: string;
    coverMessage?: string;
  }>();
  const [tagName, setTagName] = useState("");
  const [description, setDescription] = useState("");
  const [tagType, setTagType] = useState("");
  const [groupId, setGroupId] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
        const response = await fetch("/api/tag/upload-tag-cover", {
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

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("tagName", tagName);
    formData.append("tagType", tagType);
    formData.append("coverUrl", uploadedFiles?.coverUrl || "");
    formData.append("coverFileName", uploadedFiles?.coverFileName || "");
    formData.append("groupId", groupId);
    formData.append("description", description);
    formData.append("sortOrder", sortOrder.toString());
    try {
      const response = await fetch("/api/tag/create", {
        method: "POST",
        body: formData,
      } as RequestInit);

      if (response.ok) {
        console.log("标签创建成功");
        await router.push("/dashboard/tags/create-success");
      } else {
        console.log("标签创建失败");
      }
    } catch (error) {
      console.error("标签创建失败: ", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* 标签组 */}
        <div className="mb-4">
          <label htmlFor="groupid" className="mb-2 block text-sm font-medium">
            选择标签组
          </label>
          <div className="relative">
            <select
              id="groupid"
              name="groupid"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              defaultValue=""
              onChange={(e) => {
                setGroupId(e.target.value);
              }}
              aria-describedby="customer-error"
            >
              <option value="" disabled>
                选择一个标签组
              </option>
              {tagGroups.map((group) => (
                <option key={group.groupid} value={group.groupid}>
                  {group.name}
                </option>
              ))}
            </select>
            <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
          </div>
        </div>
        {/* 标签类型 */}
        <div className="mb-4">
          <label htmlFor="tagType" className="mb-2 block text-sm font-medium">
            选择标签类型
          </label>
          <div className="relative">
            <select
              id="tagType"
              name="tagType"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              defaultValue=""
              onChange={(e) => {
                setTagType(e.target.value);
              }}
              aria-describedby="customer-error"
            >
              <option value="" disabled>
                选择一个标签类型
              </option>
              <option key={TagType.UNIVERSAL} value={TagType.UNIVERSAL}>
                通用标签
              </option>
              <option key={TagType.PODCAST} value={TagType.PODCAST}>
                播客标签
              </option>
              <option key={TagType.EPISODE} value={TagType.EPISODE}>
                剧集标签
              </option>
            </select>
            <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
          </div>
        </div>
        {/* tag name */}
        <div className="mb-4">
          <label
            htmlFor="tagGroupName"
            className="mb-2 block text-sm font-medium"
          >
            标签名称
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="tagName"
                name="tagName"
                type="text"
                placeholder="标签名称"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                required
              />
              <MicrophoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
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

        {/* 是否推荐 */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">推荐标签</legend>
          <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3">
            <div className="flex gap-4">
              <div className="flex items-center">
                <input
                  id="isFeatured"
                  name="isFeatured"
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2 accent-pink-500"
                />
                <label
                  htmlFor="isFeatured"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                >
                  {/*<CheckIcon className="h-4 w-4" />*/} 是否推荐
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
            标签描述
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
