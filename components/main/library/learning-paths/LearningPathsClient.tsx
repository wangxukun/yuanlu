"use client";

import React, { useState } from "react";
import { Plus, Search, Map, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import LearningPathCard, { LearningPath } from "./LearningPathCard";
import { createLearningPathAction } from "@/lib/actions/learning-path-actions";
import clsx from "clsx";

interface LearningPathsClientProps {
  myPaths: LearningPath[];
  publicPaths: LearningPath[];
}

export default function LearningPathsClient({
  myPaths,
  publicPaths,
}: LearningPathsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"my-paths" | "official">(
    "my-paths",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Form State
  const [newPathName, setNewPathName] = useState("");
  const [newPathDesc, setNewPathDesc] = useState("");
  const [isNewPathPublic, setIsNewPathPublic] = useState(false);

  // Filter Logic
  const sourcePaths = activeTab === "official" ? publicPaths : myPaths;
  const displayedPaths = sourcePaths.filter((path) =>
    path.pathName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreatePath = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData();
    formData.append("pathName", newPathName);
    formData.append("description", newPathDesc);
    formData.append("isPublic", String(isNewPathPublic));

    const res = await createLearningPathAction(null, formData);

    setIsPending(false);
    if (res?.success) {
      setIsCreateModalOpen(false);
      setNewPathName("");
      setNewPathDesc("");
      router.refresh(); // 刷新数据
    } else {
      alert(res?.error || "创建失败");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          {/* [Refactor] text-slate-900 -> text-base-content, text-indigo-600 -> text-primary */}
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight flex items-center">
            <Map className="mr-3 text-primary" size={32} />
            学习路径
          </h1>
          {/* [Refactor] text-slate-500 -> text-base-content/60 */}
          <p className="text-base-content/60 mt-2 font-medium">
            精心策划的课程和您专属的个人学习播放列表
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          // [Refactor] shadow-indigo-100 -> shadow-primary/20
          className="btn btn-primary shadow-lg shadow-primary/20 rounded-xl font-bold"
        >
          <Plus size={20} className="mr-2" />
          创建新路径
        </button>
      </div>

      {/* Tabs & Search */}
      {/* [Refactor] bg-white -> bg-base-100, border-gray-100 -> border-base-300 */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-base-100 p-2 rounded-2xl shadow-sm border border-base-300">
        {/* [Refactor] bg-gray-100 -> bg-base-200 */}
        <div className="flex p-1 bg-base-200 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("my-paths")}
            className={clsx(
              "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === "my-paths"
                ? "bg-base-100 text-primary shadow-sm" // [Refactor] bg-white -> bg-base-100, text-indigo-600 -> text-primary
                : "text-base-content/60 hover:text-base-content", // [Refactor] text-gray-500 -> text-base-content/60
            )}
          >
            我的集合
          </button>
          <button
            onClick={() => setActiveTab("official")}
            className={clsx(
              "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === "official"
                ? "bg-base-100 text-primary shadow-sm"
                : "text-base-content/60 hover:text-base-content",
            )}
          >
            发现
          </button>
        </div>

        <div className="relative flex-1 w-full">
          {/* [Refactor] text-gray-400 -> text-base-content/40 */}
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
          />
          <input
            type="text"
            placeholder="搜索路径..."
            // [Refactor] focus:bg-gray-50 -> focus:bg-base-200
            className="input input-ghost w-full pl-10 bg-transparent focus:bg-base-200 rounded-xl focus:ring-0 text-sm placeholder:text-base-content/40 text-base-content"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Paths Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedPaths.map((path) => (
          <div key={path.pathid} className="h-full">
            <LearningPathCard
              path={path}
              // 使用 Next.js 路由跳转
              onClick={() =>
                router.push(`/library/learning-paths/${path.pathid}`)
              }
              onPlay={(e) => {
                e.stopPropagation();
                router.push(`/library/learning-paths/${path.pathid}`);
              }}
            />
          </div>
        ))}

        {/* Create Card (Only in My Paths and when no search) */}
        {activeTab === "my-paths" && searchQuery === "" && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            // [Refactor] border-gray-200 -> border-base-300, text-gray-400 -> text-base-content/40
            // Hover: hover:border-indigo-300 -> hover:border-primary/50, hover:bg-indigo-50 -> hover:bg-base-200
            className="border-2 border-dashed border-base-300 rounded-3xl flex flex-col items-center justify-center p-8 text-base-content/40 hover:border-primary/50 hover:text-primary hover:bg-base-200 transition-all h-full min-h-[300px] group"
          >
            {/* [Refactor] bg-gray-50 -> bg-base-200 */}
            <div className="w-12 h-12 bg-base-200 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <span className="font-bold">创建新的播放列表</span>
          </button>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        // [Refactor] bg-slate-900/50 -> bg-black/50 (更通用的遮罩)
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          {/* [Refactor] bg-white -> bg-base-100 */}
          <div className="bg-base-100 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200 border border-base-200">
            {/* [Refactor] text-gray-900 -> text-base-content */}
            <h2 className="text-xl font-bold text-base-content mb-6">
              创建新的学习路径
            </h2>

            <form onSubmit={handleCreatePath} className="space-y-4">
              <div>
                {/* [Refactor] text-gray-500 -> text-base-content/60 */}
                <label className="block text-xs font-bold text-base-content/60 uppercase mb-1">
                  路径名称
                </label>
                <input
                  required
                  type="text"
                  // [Refactor] bg-gray-50 -> bg-base-200, focus:bg-white -> focus:bg-base-100
                  className="input input-bordered w-full rounded-xl bg-base-200 focus:bg-base-100 transition-colors text-base-content"
                  placeholder="例如：词汇学习"
                  value={newPathName}
                  onChange={(e) => setNewPathName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content/60 uppercase mb-1">
                  描述（可选）
                </label>
                <textarea
                  rows={3}
                  className="textarea textarea-bordered w-full rounded-xl bg-base-200 focus:bg-base-100 resize-none transition-colors text-base-content"
                  placeholder="这个集合是关于什么的？"
                  value={newPathDesc}
                  onChange={(e) => setNewPathDesc(e.target.value)}
                />
              </div>

              <div
                // [Refactor] bg-gray-50 -> bg-base-200/50, border-gray-100 -> border-base-300, hover:bg-gray-100 -> hover:bg-base-200
                className="flex items-center gap-3 p-4 bg-base-200/50 rounded-xl border border-base-300 cursor-pointer hover:bg-base-200 transition-colors"
                onClick={() => setIsNewPathPublic(!isNewPathPublic)}
              >
                <div
                  className={clsx(
                    "w-6 h-6 rounded-md border flex items-center justify-center transition-colors shrink-0",
                    isNewPathPublic
                      ? "bg-primary border-primary" // [Refactor] bg-indigo-600 -> bg-primary
                      : "bg-base-100 border-base-content/20", // [Refactor] bg-white -> bg-base-100, border-gray-300 -> border-base-content/20
                  )}
                >
                  {isNewPathPublic && (
                    <CheckCircle2 size={16} className="text-primary-content" />
                  )}
                </div>
                <div>
                  <span className="block text-sm font-bold text-base-content">
                    公开
                  </span>
                  <span className="block text-xs text-base-content/60">
                    允许其他用户发现并关注这条路径
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-ghost flex-1 rounded-xl text-base-content/80"
                  disabled={isPending}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1 rounded-xl shadow-lg shadow-primary/20"
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="animate-spin w-4 h-4" />}
                  创建路径
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
