"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheckIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { diffWords, diffChars, Change } from "diff";

interface ProofreadItem {
  id: number;
  episodeid: string;
  episodeTitle: string;
  subtitleIndex: number;
  originalTextEn: string;
  originalTextZh: string;
  modifiedTextEn: string;
  modifiedTextZh: string;
  status: string;
  submitterName: string;
  submitterId: string;
  createdAt: string;
}

/** Render diff highlighting for text comparison */
function DiffHighlight({
  original,
  modified,
  type,
}: {
  original: string;
  modified: string;
  type: "original" | "modified";
}) {
  // Use diffWords for English (space-separated), diffChars for Chinese
  const isChinese = /[\u4e00-\u9fff]/.test(original + modified);
  const changes: Change[] = isChinese
    ? diffChars(original, modified)
    : diffWords(original, modified);

  return (
    <span>
      {changes.map((part, i) => {
        if (type === "original") {
          // In the "original" column, show removed text with red bg + strikethrough
          if (part.removed) {
            return (
              <span
                key={i}
                className="bg-red-100 text-red-700 line-through rounded px-0.5 font-medium"
              >
                {part.value}
              </span>
            );
          }
          // Show unchanged text normally
          if (!part.added) {
            return <span key={i}>{part.value}</span>;
          }
          // Skip added text in original column
          return null;
        } else {
          // In the "modified" column, show added text with green bg
          if (part.added) {
            return (
              <span
                key={i}
                className="bg-emerald-100 text-emerald-700 rounded px-0.5 font-medium"
              >
                {part.value}
              </span>
            );
          }
          // Show unchanged text normally
          if (!part.removed) {
            return <span key={i}>{part.value}</span>;
          }
          // Skip removed text in modified column
          return null;
        }
      })}
    </span>
  );
}

export default function ProofreadReviewClient() {
  const [items, setItems] = useState<ProofreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/proofread/pending");
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("获取审核列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleReview = async (id: number, action: "approve" | "reject") => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/proofread/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        toast.success(action === "approve" ? "已通过并更新字幕" : "已拒绝");
        // Remove from list
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        const data = await res.json();
        toast.error(data.error || "操作失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <ShieldCheckIcon className="w-16 h-16 text-base-content/20 mx-auto mb-4" />
        <p className="text-lg font-medium text-base-content/40">
          暂无待审核的校对请求
        </p>
        <p className="text-sm text-base-content/30 mt-1">
          所有校对请求都已处理完毕
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-base-100 rounded-2xl border border-base-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Card Header */}
          <div className="px-6 py-4 flex flex-wrap items-start justify-between gap-4 border-b border-base-200/50">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-base-content/50">
                <ClockIcon className="w-4 h-4" />
                <span>
                  提交时间：{new Date(item.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>
              <a
                href={`/episode/${item.episodeid}#subtitle-${item.subtitleIndex}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-800 font-medium text-sm transition-colors hover:underline"
              >
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                {item.episodeTitle}
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleReview(item.id, "reject")}
                disabled={actionLoading === item.id}
                className="btn btn-sm btn-ghost text-red-500 hover:bg-red-50 hover:text-red-600 gap-1"
              >
                <XMarkIcon className="w-4 h-4" />
                拒绝
              </button>
              <button
                onClick={() => handleReview(item.id, "approve")}
                disabled={actionLoading === item.id}
                className="btn btn-sm bg-violet-600 hover:bg-violet-700 text-white border-violet-600 gap-1"
              >
                {actionLoading === item.id ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <CheckIcon className="w-4 h-4" />
                )}
                通过并更新
              </button>
            </div>
          </div>

          {/* Card Body — Diff comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-base-200">
            {/* Original */}
            <div className="p-6">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">
                原始内容
              </p>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                <p className="text-base leading-relaxed text-slate-700 font-serif">
                  <DiffHighlight
                    original={item.originalTextEn}
                    modified={item.modifiedTextEn}
                    type="original"
                  />
                </p>
                <p className="text-sm leading-relaxed text-slate-500">
                  <DiffHighlight
                    original={item.originalTextZh}
                    modified={item.modifiedTextZh}
                    type="original"
                  />
                </p>
              </div>
            </div>

            {/* Modified */}
            <div className="p-6">
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3">
                用户修改
              </p>
              <div className="bg-emerald-50/30 rounded-xl p-4 space-y-3 border border-emerald-100">
                <p className="text-base leading-relaxed text-slate-700 font-serif">
                  <DiffHighlight
                    original={item.originalTextEn}
                    modified={item.modifiedTextEn}
                    type="modified"
                  />
                </p>
                <p className="text-sm leading-relaxed text-slate-500">
                  <DiffHighlight
                    original={item.originalTextZh}
                    modified={item.modifiedTextZh}
                    type="modified"
                  />
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
