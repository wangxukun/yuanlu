"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TagSelector } from "@/components/admin/tags/tag-selector";
import PodcastSelecter from "@/components/admin/episodes/podcastSelecter";
import { CheckIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Podcast } from "@/core/podcast/podcast.entity";
import { EpisodeEditItem } from "@/core/episode/dto/episode-edit-item";
import { Tag } from "@/core/tag/tag.entity";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// 常量定义
const DIFFICULTY_OPTIONS = [
  { value: "General", label: "通用 (General)" },
  { value: "A1", label: "入门 (A1)" },
  { value: "A2", label: "初级 (A2)" },
  { value: "B1", label: "中级 (B1)" },
  { value: "B2", label: "中高级 (B2)" },
  { value: "C1", label: "高级 (C1)" },
  { value: "C2", label: "精通 (C2)" },
];

interface Props {
  episode: EpisodeEditItem;
}

export default function EpisodeEditForm({ episode }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(episode.title || "");
  const [description, setDescription] = useState(episode.description || "");
  const [publishStatus, setPublishStatus] = useState(
    episode.status || "published",
  );
  const [publishDate, setPublishDate] = useState(
    episode.publishAt
      ? new Date(episode.publishAt).toISOString().split("T")[0]
      : "",
  );
  const [isExclusive, setIsExclusive] = useState(episode.isExclusive || false);
  // [新增]
  const [difficulty, setDifficulty] = useState(episode.difficulty || "General");
  const [podcastId, setPodcastId] = useState(episode.podcastid || "");
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);

  // [修改] 初始化标签状态：提取标签名称
  const [selectedTags, setSelectedTags] = useState<string[]>(
    episode.tags ? episode.tags.map((t: Tag) => t.name) : [],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // [修改] 移除 fetchTagsData，只保留获取播客列表
  useEffect(() => {
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
    fetchPodcastData();
  }, []);

  const handlePodcastSelect = (id: string) => {
    setPodcastId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/episode/update-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeid: episode.episodeid,
          title,
          description,
          status: publishStatus,
          publishAt: publishDate,
          podcastId,
          isExclusive,
          difficulty,
          tags: selectedTags, // [修改] 提交标签名数组
        }),
      });

      if (res.ok) {
        router.push("/admin/episodes/update-info-success");
        router.refresh();
      } else {
        alert("更新失败");
      }
    } catch (error) {
      console.error(error);
      alert("网络错误");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl">
      {/* 标题 */}
      <div className="flex flex-row items-center">
        <label className="w-24 font-semibold text-right mr-4">
          <span className="text-red-500 mr-1">*</span>标题
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          type="text"
          className="input input-bordered flex-1"
          required
        />
      </div>

      {/* 简介 */}
      <div className="flex flex-row items-start">
        <label className="w-24 font-semibold text-right mr-4 mt-2">
          <span className="text-red-500 mr-1">*</span>简介
        </label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="textarea textarea-bordered flex-1"
          required
        />
      </div>

      {/* [修改] 标签 */}
      <div className="flex flex-row items-start">
        <label className="w-24 font-semibold text-right mr-4 mt-2">
          <span className="text-red-500 mr-1">*</span>标签
        </label>
        <div className="flex-1">
          <TagSelector
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            maxSelected={10}
          />
        </div>
      </div>

      {/* Difficulty Field */}
      <div className="flex flex-row items-center">
        <label className="w-24 font-semibold text-right mr-4">难度等级</label>
        <div className="flex-1">
          <div className="relative w-80">
            <select
              className="select select-success"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 状态 */}
      <div className="flex flex-row items-center">
        <label className="w-24 font-semibold text-right mr-4">状态</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              value="published"
              checked={publishStatus === "published"}
              onChange={(e) => setPublishStatus(e.target.value)}
              className="radio radio-success"
            />
            <span className="badge badge-success gap-1 text-white p-3">
              发布 <CheckIcon className="w-4 h-4" />
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              value="reviewing"
              checked={publishStatus === "reviewing"}
              onChange={(e) => setPublishStatus(e.target.value)}
              className="radio"
            />
            <span className="badge badge-ghost gap-1 p-3">
              待审核 <ClockIcon className="w-4 h-4" />
            </span>
          </label>
        </div>
      </div>

      {/* 发布日期 */}
      <div className="flex flex-row items-center">
        <label className="w-24 font-semibold text-right mr-4">发布日期</label>
        <input
          type="date"
          value={publishDate}
          onChange={(e) => setPublishDate(e.target.value)}
          className="input input-bordered w-60"
        />
      </div>

      {/* 所属播客 */}
      <div className="flex flex-row items-center">
        <label className="w-24 font-semibold text-right mr-4">所属播客</label>
        <div className="flex-1">
          <PodcastSelecter
            currentPodcastId={podcastId}
            podcasts={podcasts}
            onValueChange={handlePodcastSelect}
          />
        </div>
      </div>

      {/* 付费设置 */}
      <div className="flex flex-row items-center">
        <label className="w-24 font-semibold text-right mr-4">付费订阅</label>
        <label className="cursor-pointer label justify-start gap-2">
          <input
            type="checkbox"
            checked={isExclusive}
            onChange={(e) => setIsExclusive(e.target.checked)}
            className="checkbox"
          />
          <span className="label-text">仅限会员</span>
        </label>
      </div>

      <div className="divider"></div>

      {/* 按钮组 */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          className="btn"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          取消
        </button>
        <button
          type="submit"
          className="btn btn-primary w-32"
          disabled={isSubmitting}
        >
          {isSubmitting ? "保存中..." : "保存修改"}
        </button>
      </div>
    </form>
  );
}
