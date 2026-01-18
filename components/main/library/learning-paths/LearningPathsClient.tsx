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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Map className="mr-3 text-indigo-600" size={32} />
            学习路径
          </h1>
          <p className="text-slate-500 mt-2">
            精心策划的课程和您专属的个人学习播放列表
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary shadow-lg shadow-indigo-100 rounded-xl font-bold"
        >
          <Plus size={20} className="mr-2" />
          创建新路径
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("my-paths")}
            className={clsx(
              "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === "my-paths"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            我的集合
          </button>
          <button
            onClick={() => setActiveTab("official")}
            className={clsx(
              "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === "official"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            发现
          </button>
        </div>

        <div className="relative flex-1 w-full">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="搜索路径..."
            className="input input-ghost w-full pl-10 bg-transparent focus:bg-gray-50 rounded-xl focus:ring-0 text-sm"
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
              // 使用 Next.js 路由跳转代替状态切换
              onClick={() =>
                router.push(`/library/learning-paths/${path.pathid}`)
              }
              onPlay={(e) => {
                e.stopPropagation();
                // 如果需要直接播放，可以调用 API 获取列表然后播放，
                // 或者简单跳转到详情页自动播放
                router.push(`/library/learning-paths/${path.pathid}`);
              }}
            />
          </div>
        ))}

        {/* Create Card (Only in My Paths and when no search) */}
        {activeTab === "my-paths" && searchQuery === "" && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-8 text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all h-full min-h-[300px]"
          >
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Plus size={24} />
            </div>
            <span className="font-bold">创建新的播放列表</span>
          </button>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              创建新的学习路径
            </h2>

            <form onSubmit={handleCreatePath} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  路径名称
                </label>
                <input
                  required
                  type="text"
                  className="input input-bordered w-full rounded-xl bg-gray-50 focus:bg-white"
                  placeholder="例如：词汇学习"
                  value={newPathName}
                  onChange={(e) => setNewPathName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  描述（可选）
                </label>
                <textarea
                  rows={3}
                  className="textarea textarea-bordered w-full rounded-xl bg-gray-50 focus:bg-white resize-none"
                  placeholder="这个集合是关于什么的？"
                  value={newPathDesc}
                  onChange={(e) => setNewPathDesc(e.target.value)}
                />
              </div>

              <div
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setIsNewPathPublic(!isNewPathPublic)}
              >
                <div
                  className={clsx(
                    "w-6 h-6 rounded-md border flex items-center justify-center transition-colors",
                    isNewPathPublic
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-white border-gray-300",
                  )}
                >
                  {isNewPathPublic && (
                    <CheckCircle2 size={16} className="text-white" />
                  )}
                </div>
                <div>
                  <span className="block text-sm font-bold text-gray-900">
                    公开
                  </span>
                  <span className="block text-xs text-gray-500">
                    允许其他用户发现并关注这条路径
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-ghost flex-1 rounded-xl"
                  disabled={isPending}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1 rounded-xl shadow-lg shadow-indigo-200"
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
