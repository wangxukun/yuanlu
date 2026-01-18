"use client";

import React, { useState, useEffect } from "react";
import {
  PlayCircle,
  MoreHorizontal,
  Lock,
  Globe,
  Shuffle,
  ListPlus,
  Trash2,
  Map,
  ArrowLeft,
  X,
  Search,
  Plus,
  CheckCircle2,
  Edit,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/store/player-store";
import {
  removeEpisodeFromPathAction,
  updateLearningPathAction,
  deleteLearningPathAction,
  addEpisodeToPathAction,
  searchEpisodesAction,
  SearchResultEpisode,
} from "@/lib/actions/learning-path-actions";
import { useDebounce } from "use-debounce";
import { Episode } from "@/core/episode/episode.entity";

// --- 辅助函数：格式化时长 ---
const formatDuration = (seconds: number) => {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export interface DetailPathData {
  pathid: number;
  pathName: string;
  description: string | null;
  coverUrl: string | null;
  isOfficial: boolean;
  isPublic: boolean;
  creatorName: string;
  itemCount: number;
  userid: string | null;
  items: {
    id: number;
    episode: {
      id: string;
      title: string;
      thumbnailUrl: string;
      author: string;
      duration: number;
      audioUrl?: string;
    } & Partial<Episode>;
  }[];
}

type EpisodeLP = {
  id: string;
  title: string;
  thumbnailUrl: string;
  author: string;
  duration: number;
} & Partial<Episode>;

interface LearningPathDetailClientProps {
  path: DetailPathData;
  currentUserId?: string;
}

const LearningPathDetailClient: React.FC<LearningPathDetailClientProps> = ({
  path: initialPath,
  currentUserId,
}) => {
  const router = useRouter();
  const { playEpisode } = usePlayerStore();

  const selectedPath = initialPath;

  // Modal States
  const [isAddEpisodeModalOpen, setIsAddEpisodeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Search State
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(episodeSearchQuery, 500);
  const [availableEpisodes, setAvailableEpisodes] = useState<
    SearchResultEpisode[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  // Edit Form State
  const [editPathName, setEditPathName] = useState(selectedPath.pathName);
  const [editPathDesc, setEditPathDesc] = useState(
    selectedPath.description || "",
  );
  const [isEditPathPublic, setIsEditPathPublic] = useState(
    selectedPath.isPublic,
  );
  const [isSaving, setIsSaving] = useState(false);

  // --- Handlers ---
  const onPlayEpisode = (episode: EpisodeLP) => {
    const playedEpisode: Episode = {
      episodeid: episode.id,
      title: episode.title,
      podcast: {
        title: episode.author,
      },
      audioUrl: episode.audioUrl,
      coverUrl: episode.thumbnailUrl,
      duration: episode.duration,
    } as Episode;
    playEpisode(playedEpisode);
  };

  const handleRemoveItem = async (e: React.MouseEvent, itemId: number) => {
    e.stopPropagation();
    if (confirm("Remove this episode from the playlist?")) {
      const res = await removeEpisodeFromPathAction(
        itemId,
        selectedPath.pathid,
      );
      if (res.success) router.refresh();
    }
  };

  const handleDeletePath = async () => {
    if (
      confirm(
        "Are you sure you want to delete this learning path? This action cannot be undone.",
      )
    ) {
      const res = await deleteLearningPathAction(selectedPath.pathid);
      if (res?.success) {
        router.push("/library/learning-paths");
      } else {
        alert("删除失败");
      }
    }
  };

  const handleOpenEdit = () => {
    setEditPathName(selectedPath.pathName);
    setEditPathDesc(selectedPath.description || "");
    setIsEditPathPublic(selectedPath.isPublic);
    setIsEditModalOpen(true);
    setIsMoreMenuOpen(false);
  };

  const handleUpdatePath = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData();
    formData.append("pathName", editPathName);
    formData.append("description", editPathDesc);
    formData.append("isPublic", String(isEditPathPublic));

    const res = await updateLearningPathAction(selectedPath.pathid, formData);
    setIsSaving(false);

    if (res?.success) {
      setIsEditModalOpen(false);
      router.refresh();
    } else {
      alert(res?.error || "更新失败");
    }
  };

  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setAvailableEpisodes([]);
      return;
    }

    const fetchEpisodes = async () => {
      setIsSearching(true);
      const results = await searchEpisodesAction(debouncedSearchQuery);
      setAvailableEpisodes(results);
      setIsSearching(false);
    };

    fetchEpisodes();
  }, [debouncedSearchQuery]);

  const handleAddEpisode = async (episodeId: string) => {
    if (selectedPath.items.some((i) => i.episode.id === episodeId)) {
      alert("该剧集已在列表中");
      return;
    }
    const res = await addEpisodeToPathAction(selectedPath.pathid, episodeId);
    if (res?.success) {
      router.refresh();
    } else {
      alert(res?.error || "添加失败");
    }
  };

  return (
    // [Refactor] bg-gray-50 -> bg-base-200: 更好的深浅模式适配基础色
    <div className="min-h-screen bg-base-200 pb-20 font-sans w-full overflow-x-hidden transition-colors duration-300">
      {/* Detail Header */}
      {/* [Refactor] bg-slate-900 -> bg-neutral text-neutral-content: 保持深色头部风格，但在主题系统中更语义化 */}
      <div className="bg-neutral bg-gradient-to-br from-primary to-secondary text-neutral-content pt-20 pb-10 md:pt-8 md:pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10 pointer-events-none">
          <Map size={400} className="fill-current" />
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center text-neutral-content/60 hover:text-neutral-content transition-colors mb-6 md:mb-8 group"
          >
            <ArrowLeft size={16} className="mr-2" /> 返回学习路径
          </button>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left">
            {/* Cover Image */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 shrink-0 mx-auto md:mx-0 bg-base-300">
              <img
                src={
                  selectedPath.coverUrl ||
                  `https://ui-avatars.com/api/?name=${selectedPath.pathName}&background=random&color=fff`
                }
                className="w-full h-full object-cover"
                alt={selectedPath.pathName}
              />
            </div>

            {/* Text Info */}
            <div className="flex-1 w-full min-w-0">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2 flex-wrap">
                {selectedPath.isOfficial && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary text-primary-content">
                    Official Course
                  </span>
                )}
                {/* [Refactor] bg-white/10: 保持透明度背景，适应 neutral 背景 */}
                <span className="flex items-center gap-1 text-xs font-medium text-neutral-content/80 bg-white/10 px-2 py-0.5 rounded">
                  {selectedPath.isPublic ? (
                    <Globe size={10} />
                  ) : (
                    <Lock size={10} />
                  )}
                  {selectedPath.isPublic ? "公开" : "私有"}
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold mb-3 leading-tight break-words">
                {selectedPath.pathName}
              </h1>
              <p className="text-base md:text-lg text-neutral-content/80 leading-relaxed max-w-2xl mx-auto md:mx-0 break-words">
                {selectedPath.description}
              </p>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-6 text-sm text-neutral-content/60">
                <span>
                  创建者{" "}
                  <strong className="text-neutral-content">
                    {selectedPath.creatorName}
                  </strong>
                </span>
                <span>•</span>
                <span>{selectedPath.itemCount} 剧集</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar & List */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 md:-mt-8 relative z-20">
        {/* Action Bar Container */}
        {/* [Refactor] bg-white -> bg-base-100, border-gray-100 -> border-base-300 */}
        <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-3 md:p-2 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 mb-6">
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() =>
                selectedPath.items.length > 0 &&
                onPlayEpisode(selectedPath.items[0].episode)
              }
              // [Refactor] shadow-indigo-200 -> shadow-primary/20: 阴影颜色适配
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-primary-content px-6 py-3 rounded-lg font-bold hover:brightness-110 transition-all shadow-md shadow-primary/20 text-sm md:text-base whitespace-nowrap"
            >
              <PlayCircle size={20} /> 播放全部
            </button>
            <button
              className="p-3 text-base-content/60 hover:bg-base-200 rounded-lg transition-colors flex-none"
              title="随机播放"
            >
              <Shuffle size={20} />
            </button>
          </div>

          <div className="flex gap-2 justify-end w-full md:w-auto relative">
            {!selectedPath.isOfficial &&
              selectedPath.userid === currentUserId && (
                <>
                  <button
                    onClick={() => setIsAddEpisodeModalOpen(true)}
                    // [Refactor] text-gray-600 -> text-base-content/80
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-sm font-bold text-base-content/80 hover:bg-base-200 rounded-lg transition-colors border md:border-none border-base-200 whitespace-nowrap"
                  >
                    <ListPlus size={18} />
                    <span>添加剧集</span>
                  </button>

                  <div className="relative flex-none">
                    <button
                      onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                      className={`p-3 w-full md:w-auto flex justify-center text-base-content/60 hover:bg-base-200 rounded-lg transition-colors ${
                        isMoreMenuOpen ? "bg-base-200 text-primary" : ""
                      }`}
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {isMoreMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsMoreMenuOpen(false)}
                        ></div>
                        {/* [Refactor] bg-white -> bg-base-100 */}
                        <div className="absolute right-0 top-full mt-2 w-48 bg-base-100 rounded-xl shadow-xl border border-base-300 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                          <button
                            onClick={handleOpenEdit}
                            className="w-full text-left px-4 py-2.5 text-sm text-base-content/80 hover:bg-base-200 flex items-center gap-2"
                          >
                            <Edit size={16} /> 编辑细节
                          </button>
                          <button
                            onClick={handleDeletePath}
                            className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-error/10 flex items-center gap-2"
                          >
                            <Trash2 size={16} /> 删除路径
                          </button>
                          <div className="h-px bg-base-200 my-1"></div>
                          <button className="w-full text-left px-4 py-2.5 text-sm text-base-content/80 hover:bg-base-200 flex items-center gap-2">
                            <Globe size={16} /> 分享路径
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
          </div>
        </div>

        {/* List Items */}
        <div className="space-y-3">
          {selectedPath.items.length > 0 ? (
            selectedPath.items.map((item, index) => (
              <div
                key={item.id}
                onClick={() => onPlayEpisode(item.episode)}
                // [Refactor] bg-white -> bg-base-100, hover:border-indigo-100 -> hover:border-primary/50
                className="group bg-base-100 p-2 md:p-4 rounded-xl border border-base-300 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex items-center gap-2 md:gap-4 w-full overflow-hidden"
              >
                {/* Index */}
                <div className="w-5 md:w-8 text-center font-bold text-base-content/30 group-hover:text-primary transition-colors text-xs md:text-base shrink-0">
                  {index + 1}
                </div>

                {/* Image */}
                <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-lg bg-base-300 overflow-hidden shrink-0">
                  <img
                    src={item.episode.thumbnailUrl}
                    className="w-full h-full object-cover"
                    alt={item.episode.title}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <PlayCircle
                      size={20}
                      className="text-white drop-shadow-md"
                    />
                  </div>
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3
                    className="font-bold text-base-content line-clamp-2 break-words group-hover:text-primary transition-colors text-sm md:text-base leading-snug mb-0.5"
                    title={item.episode.title}
                  >
                    {item.episode.title}
                  </h3>
                  <p className="text-xs text-base-content/60 truncate">
                    {item.episode.author} •{" "}
                    {formatDuration(item.episode.duration)}
                  </p>
                </div>

                {/* Actions */}
                {!selectedPath.isOfficial &&
                  selectedPath.userid === currentUserId && (
                    <div className="flex items-center gap-1 md:gap-2 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleRemoveItem(e, item.id)}
                        className="p-2 text-base-content/30 hover:text-error hover:bg-error/10 rounded-full transition-colors shrink-0"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-base-content/40 bg-base-100 rounded-xl border border-dashed border-base-300">
              <ListPlus size={40} className="mx-auto mb-3 opacity-20" />
              <p>This path is empty. Add episodes to start learning.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- ADD EPISODE MODAL --- */}
      {/* [Refactor] 这里的 Modal 结构保持，但背景色改为语义化 */}
      {isAddEpisodeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-base-300/60 backdrop-blur-sm">
          <div className="bg-base-100 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh] h-auto border border-base-200">
            <div className="p-4 border-b border-base-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-base-content">
                Add Episode
              </h2>
              <button
                onClick={() => setIsAddEpisodeModalOpen(false)}
                className="p-2 hover:bg-base-200 rounded-full text-base-content/60"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-base-200">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
                  size={16}
                />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search..."
                  // [Refactor] bg-gray-50 -> bg-base-200
                  className="w-full pl-9 pr-4 py-2.5 bg-base-200 border border-transparent focus:bg-base-100 focus:border-primary rounded-xl focus:outline-none focus:ring-0 transition-all text-sm text-base-content placeholder:text-base-content/40"
                  value={episodeSearchQuery}
                  onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : availableEpisodes.length > 0 ? (
                availableEpisodes.map((episode) => {
                  const isAdded = selectedPath.items.some(
                    (i) => i.episode.id === episode.id,
                  );
                  return (
                    <button
                      key={episode.id}
                      onClick={() => !isAdded && handleAddEpisode(episode.id)}
                      disabled={isAdded}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left group ${
                        isAdded
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-base-200"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-base-300 overflow-hidden shrink-0">
                        <img
                          src={
                            episode.thumbnailUrl ||
                            "/static/images/episode-light.png"
                          }
                          className="w-full h-full object-cover"
                          alt={episode.title}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base-content text-sm truncate">
                          {episode.title}
                        </h4>
                        <p className="text-xs text-base-content/60 flex items-center mt-0.5">
                          {episode.author}
                        </p>
                      </div>
                      <div className="p-2 text-primary shrink-0">
                        {isAdded ? (
                          <CheckCircle2
                            size={20}
                            className="text-base-content/30"
                          />
                        ) : (
                          <Plus size={20} />
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-base-content/40">
                  <Search size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">
                    {episodeSearchQuery
                      ? "No episodes found."
                      : "Type to search..."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT PATH MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-base-300/60 backdrop-blur-sm">
          <div className="bg-base-100 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200 border border-base-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-base-content">Edit Path</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-base-200 rounded-full text-base-content/60"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdatePath} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-content/50 uppercase mb-1">
                  Name
                </label>
                <input
                  required
                  type="text"
                  className="input input-bordered w-full rounded-xl bg-base-100"
                  value={editPathName}
                  onChange={(e) => setEditPathName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content/50 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="textarea textarea-bordered w-full rounded-xl resize-none bg-base-100"
                  value={editPathDesc}
                  onChange={(e) => setEditPathDesc(e.target.value)}
                />
              </div>

              <div
                className="flex items-center gap-3 p-4 bg-base-200/50 rounded-xl border border-base-200 cursor-pointer hover:bg-base-200 transition-colors"
                onClick={() => setIsEditPathPublic(!isEditPathPublic)}
              >
                <div
                  className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    isEditPathPublic
                      ? "bg-primary border-primary"
                      : "bg-base-100 border-base-300"
                  }`}
                >
                  {isEditPathPublic && (
                    <CheckCircle2 size={16} className="text-white" />
                  )}
                </div>
                <div>
                  <span className="block text-sm font-bold text-base-content">
                    Make Public
                  </span>
                  <span className="block text-xs text-base-content/60">
                    Allow others to see this path.
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-ghost flex-1 rounded-xl text-base-content/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary flex-1 rounded-xl shadow-lg shadow-primary/20"
                >
                  {isSaving && (
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  )}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPathDetailClient;
