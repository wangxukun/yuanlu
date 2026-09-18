"use client";

import React, { useState } from "react";
import {
  Plus,
  Search,
  Route,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LearningPathCard, { LearningPath } from "./LearningPathCard";
import { createLearningPathAction } from "@/lib/actions/learning-path-actions";
import { useUIStore } from "@/store/ui-store";
import { FREE_PATH_LIMIT, PATH_QUOTA_EXCEEDED } from "@/lib/quota";
import clsx from "clsx";

interface LearningPathsClientProps {
  myPaths: LearningPath[];
  publicPaths: LearningPath[];
  /** [P3-h] SSR 会员态：创建触墙前置判定 + AI 生成入口分层 */
  isPremium: boolean;
}

export default function LearningPathsClient({
  myPaths,
  publicPaths,
  isPremium,
}: LearningPathsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"my-paths" | "official">(
    "my-paths",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // [P3-h] 免费用户路径容量已满：创建入口直接走会员弹窗承接
  // （服务端 service 层仍兜底拦截——前端预拦只是体验层，双口径同源）
  const pathQuotaReached = !isPremium && myPaths.length >= FREE_PATH_LIMIT;

  // AI 生成状态
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const openPremiumModal = useUIStore((s) => s.openPremiumModal);

  // Form State
  const [newPathName, setNewPathName] = useState("");
  const [newPathDesc, setNewPathDesc] = useState("");
  const [isNewPathPublic, setIsNewPathPublic] = useState(false);

  // Filter Logic
  const sourcePaths = activeTab === "official" ? publicPaths : myPaths;
  const displayedPaths = sourcePaths.filter((path) =>
    path.pathName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreateClick = () => {
    if (pathQuotaReached) {
      // 配额墙：弹窗承接 + 埋点（openPremiumModal 内置 PREMIUM_MODAL_OPEN）
      openPremiumModal("path_quota", {
        limit: FREE_PATH_LIMIT,
        totalCount: myPaths.length,
      });
      return;
    }
    setIsCreateModalOpen(true);
  };

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
      toast.success("学习路径已创建");
      router.refresh(); // 刷新数据
    } else if (res?.code === PATH_QUOTA_EXCEEDED) {
      // 并发/多端兜底：容量在打开弹窗后被占满（服务端拦截命中）
      setIsCreateModalOpen(false);
      openPremiumModal("path_quota", { totalCount: FREE_PATH_LIMIT });
    } else {
      toast.error(res?.error || "创建失败");
    }
  };

  const handleGenerateClick = () => {
    if (!isPremium) {
      // AI 生成墙：PRO 专属（LLM 真实边际成本），弹窗承接 + 埋点
      openPremiumModal("path_ai_generate");
      return;
    }
    setIsGenerateModalOpen(true);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const topic = generateTopic.trim();
    if (!topic) {
      toast.error("请先填写学习主题");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/learning-paths/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        setIsGenerateModalOpen(false);
        setGenerateTopic("");
        toast.success(
          `AI 已生成「${json.data.pathName}」（${json.data.itemCount} 集）`,
        );
        router.refresh();
        return;
      }

      const code = json?.code as string | undefined;
      if (res.status === 403 && code === "PREMIUM_REQUIRED") {
        // 会员态过期（SSR 缓存态与实时态的缝隙）：弹窗承接
        setIsGenerateModalOpen(false);
        openPremiumModal("path_ai_generate");
        return;
      }

      // LLM 失败 / 无匹配：降级为手动创建流程（预填主题），不阻断
      toast.warning(json?.message || "AI 生成失败，已为你切换到手动创建");
      setIsGenerateModalOpen(false);
      setIsCreateModalOpen(true);
      setNewPathName(topic.slice(0, 50));
    } catch {
      toast.warning("网络异常，已为你切换到手动创建");
      setIsGenerateModalOpen(false);
      setIsCreateModalOpen(true);
      setNewPathName(topic.slice(0, 50));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight flex items-center">
            <Route
              className="mr-3 text-primary-600 dark:text-primary-400"
              size={32}
            />
            学习路径
          </h1>
          {/* [P3-h] 免费容量提示（会员不展示） */}
          {!isPremium && (
            <p className="text-xs text-base-content/50 mt-2 font-medium">
              免费可创建 {FREE_PATH_LIMIT} 条路径（
              {Math.min(myPaths.length, FREE_PATH_LIMIT)}/{FREE_PATH_LIMIT}{" "}
              已用）· 编辑排序始终免费
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateClick}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-colors ${
              isPremium
                ? "bg-gradient-to-r from-violet-500 to-primary-500 hover:from-violet-600 hover:to-primary-600 text-white shadow-md"
                : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-300/60 dark:border-amber-500/30"
            }`}
            aria-label="AI 生成学习路径"
          >
            <Sparkles size={18} />
            <span>AI 生成路径{!isPremium && " · PRO"}</span>
          </button>
          <button
            onClick={handleCreateClick}
            className="bg-[#1F7A5C] hover:bg-[#1A6349] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-colors"
          >
            <Plus size={20} />
            <span>创建新路径</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-ink-900 p-2 rounded-lg">
        <div className="flex p-1 bg-ink-50 dark:bg-ink-950 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("my-paths")}
            className={clsx(
              "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === "my-paths"
                ? "bg-base-100 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-base-content/60 hover:text-base-content", // [Refactor] text-ink-500 -> text-base-content/60
            )}
          >
            我的集合
          </button>
          <button
            onClick={() => setActiveTab("official")}
            className={clsx(
              "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === "official"
                ? "bg-base-100 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-base-content/60 hover:text-base-content",
            )}
          >
            发现
          </button>
        </div>

        <div className="relative flex-1 w-full">
          {/* [Refactor] text-ink-400 -> text-base-content/40 */}
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
          />
          <input
            type="text"
            placeholder="搜索路径..."
            // [Refactor] focus:bg-ink-50 -> focus:bg-base-200
            className="input input-ghost w-full pl-10 bg-transparent focus:bg-base-200 rounded-lg focus:ring-0 text-sm placeholder:text-base-content/40 text-base-content"
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
            onClick={handleCreateClick}
            className="rounded-lg flex flex-col items-center justify-center p-8 text-base-content/40 bg-white dark:bg-ink-900 hover:text-primary-600 dark:hover:text-primary-400 transition-all h-full min-h-[300px] group"
          >
            <div className="w-12 h-12 bg-ink-50 dark:bg-ink-950 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <span className="font-bold">
              {pathQuotaReached
                ? "容量已满 · 解锁无限路径"
                : "创建新的播放列表"}
            </span>
          </button>
        )}
      </div>

      {/* AI GENERATE MODAL */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-ink-900 w-full max-w-md rounded-lg overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-base-content mb-2 flex items-center gap-2">
              <Sparkles size={20} className="text-violet-500" />
              AI 生成学习路径
            </h2>
            <p className="text-sm text-base-content/60 mb-5">
              告诉 AI
              你的学习目标，它会从剧集库中挑出最相关的一串，按先易后难排好。
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-content/60 uppercase mb-1">
                  学习主题 / 目标
                </label>
                <input
                  required
                  type="text"
                  className="input input-bordered w-full rounded-lg bg-base-200 focus:bg-base-100 transition-colors text-base-content"
                  placeholder="例如：商务英语入门 / 日常口语表达"
                  value={generateTopic}
                  onChange={(e) => setGenerateTopic(e.target.value)}
                  maxLength={200}
                />
              </div>

              <p className="text-xs text-base-content/40">
                生成失败会自动切换到手动创建，主题会帮你预填好。
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="btn btn-ghost flex-1 rounded-lg text-base-content/80"
                  disabled={isGenerating}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn flex-1 rounded-lg bg-gradient-to-r from-violet-500 to-primary-500 hover:from-violet-600 hover:to-primary-600 text-white border-none"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4" />
                      AI 正在挑选剧集...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      开始生成
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-ink-900 w-full max-w-md rounded-lg overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            {/* [Refactor] text-ink-900 -> text-base-content */}
            <h2 className="text-xl font-bold text-base-content mb-6">
              创建新的学习路径
            </h2>

            <form onSubmit={handleCreatePath} className="space-y-4">
              <div>
                {/* [Refactor] text-ink-500 -> text-base-content/60 */}
                <label className="block text-xs font-bold text-base-content/60 uppercase mb-1">
                  路径名称
                </label>
                <input
                  required
                  type="text"
                  // [Refactor] bg-ink-50 -> bg-base-200, focus:bg-white -> focus:bg-base-100
                  className="input input-bordered w-full rounded-lg bg-base-200 focus:bg-base-100 transition-colors text-base-content"
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
                  className="textarea textarea-bordered w-full rounded-lg bg-base-200 focus:bg-base-100 resize-none transition-colors text-base-content"
                  placeholder="这个集合是关于什么的？"
                  value={newPathDesc}
                  onChange={(e) => setNewPathDesc(e.target.value)}
                />
              </div>

              <div
                // [Refactor] bg-ink-50 -> bg-base-200/50, border-ink-100 -> border-base-300, hover:bg-ink-100 -> hover:bg-base-200
                className="flex items-center gap-3 p-4 bg-base-200/50 rounded-lg cursor-pointer hover:bg-base-200 transition-colors"
                onClick={() => setIsNewPathPublic(!isNewPathPublic)}
              >
                <div
                  className={clsx(
                    "w-6 h-6 rounded-md border flex items-center justify-center transition-colors shrink-0",
                    isNewPathPublic
                      ? "bg-primary-600 dark:bg-primary-400 border-primary-600 dark:border-primary-400"
                      : "bg-base-100 border-base-content/20", // [Refactor] bg-white -> bg-base-100, border-ink-300 -> border-base-content/20
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
                  className="btn btn-ghost flex-1 rounded-lg text-base-content/80"
                  disabled={isPending}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1 rounded-lg"
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
