"use client";

import React, { useState } from "react";
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
  Clock,
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
import { Episode } from "@/core/episode/episode.entity"; // 如果没有安装，可以使用 useEffect 手写防抖

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
  userid: string | null; // 用于权限判断
  items: {
    id: number;
    episode: {
      id: string;
      title: string;
      thumbnailUrl: string;
      author: string;
      duration: number;
    } & Partial<Episode>;
  }[];
}

/**
 * 播放列表详情页
 */
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

  // Local State for UI updates (optimistic UI mostly handled by router.refresh, but good for modals)
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

  // 1. Play Episode
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

  // 2. Remove Episode
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

  // 3. Delete Path
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

  // 4. Update Path
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
      // router.refresh() handles the UI update
    } else {
      alert(res?.error || "更新失败");
    }
  };

  // 5. Search & Add Episode
  // Fetch episodes when search query changes
  React.useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setAvailableEpisodes([]);
      return;
    }

    const fetchEpisodes = async () => {
      setIsSearching(true);
      const results = await searchEpisodesAction(debouncedSearchQuery);
      setAvailableEpisodes(results);
      console.log("SearchEpisodes: ", results);
      setIsSearching(false);
    };

    fetchEpisodes();
  }, [debouncedSearchQuery]);

  const handleAddEpisode = async (episodeId: string) => {
    // 检查是否已存在 (简单前端检查，后端也有校验)
    if (selectedPath.items.some((i) => i.episode.id === episodeId)) {
      alert("该剧集已在列表中");
      return;
    }

    const res = await addEpisodeToPathAction(selectedPath.pathid, episodeId);
    if (res?.success) {
      router.refresh();
      // 可选：添加成功后关闭弹窗或显示 Toast
      // setIsAddEpisodeModalOpen(false);
    } else {
      alert(res?.error || "添加失败");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* Detail Header */}
      <div className="bg-slate-900 text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10">
          <Map size={400} />
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to Paths
          </button>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-40 h-40 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 shrink-0">
              <img
                src={
                  selectedPath.coverUrl ||
                  `https://ui-avatars.com/api/?name=${selectedPath.pathName}&background=random&color=fff`
                }
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {selectedPath.isOfficial && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500 text-white">
                    Official Course
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-white/10 px-2 py-0.5 rounded">
                  {selectedPath.isPublic ? (
                    <Globe size={10} />
                  ) : (
                    <Lock size={10} />
                  )}
                  {selectedPath.isPublic ? "Public" : "Private"}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight">
                {selectedPath.pathName}
              </h1>
              <p className="text-lg text-gray-300 leading-relaxed max-w-2xl">
                {selectedPath.description}
              </p>
              <div className="flex items-center gap-4 mt-6 text-sm text-gray-400">
                <span>
                  By{" "}
                  <strong className="text-white">
                    {selectedPath.creatorName}
                  </strong>
                </span>
                <span>•</span>
                <span>{selectedPath.itemCount} Episodes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar & List */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() =>
                selectedPath.items.length > 0 &&
                onPlayEpisode(selectedPath.items[0].episode)
              }
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
            >
              <PlayCircle size={20} /> Play All
            </button>
            <button
              className="p-3 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Shuffle"
            >
              <Shuffle size={20} />
            </button>
          </div>

          <div className="flex gap-2 relative">
            {/* Add Episode Button */}
            {!selectedPath.isOfficial &&
              selectedPath.userid === currentUserId && (
                <button
                  onClick={() => setIsAddEpisodeModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ListPlus size={18} /> Add Episode
                </button>
              )}

            {/* More Options Menu */}
            {!selectedPath.isOfficial &&
              selectedPath.userid === currentUserId && (
                <div className="relative">
                  <button
                    onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                    className={`p-3 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors ${isMoreMenuOpen ? "bg-gray-100 text-indigo-600" : ""}`}
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  {isMoreMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsMoreMenuOpen(false)}
                      ></div>
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                        <button
                          onClick={handleOpenEdit}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit size={16} /> Edit Details
                        </button>
                        <button
                          onClick={handleDeletePath}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 size={16} /> Delete Path
                        </button>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Globe size={16} /> Share Path
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
                className="group bg-white p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
              >
                <div className="w-8 text-center font-bold text-gray-300 group-hover:text-indigo-600 transition-colors">
                  {index + 1}
                </div>
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  <img
                    src={item.episode.thumbnailUrl}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                    {item.episode.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {item.episode.author} •{" "}
                    {formatDuration(item.episode.duration)}
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle size={24} className="text-indigo-600" />
                  {!selectedPath.isOfficial &&
                    selectedPath.userid === currentUserId && (
                      <button
                        onClick={(e) => handleRemoveItem(e, item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              <ListPlus size={40} className="mx-auto mb-3 opacity-20" />
              <p>This path is empty. Add episodes to start learning.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- ADD EPISODE MODAL --- */}
      {isAddEpisodeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add Episode</h2>
              <button
                onClick={() => setIsAddEpisodeModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search available episodes..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={episodeSearchQuery}
                  onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="animate-spin text-indigo-600" size={24} />
                </div>
              ) : availableEpisodes.length > 0 ? (
                availableEpisodes.map((episode) => {
                  const isAdded = selectedPath.items.some(
                    (i) => i.episode.id === episode.id,
                  );
                  console.log("Episode thumbnailUrl: ", episode.thumbnailUrl);
                  return (
                    <button
                      key={episode.id}
                      onClick={() => !isAdded && handleAddEpisode(episode.id)}
                      disabled={isAdded}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left group ${isAdded ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                        <img
                          src={
                            episode.thumbnailUrl ||
                            "/static/images/episode-light.png"
                          }
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate">
                          {episode.title}
                        </h4>
                        <p className="text-xs text-gray-500 flex items-center mt-0.5">
                          {episode.author} •{" "}
                          <Clock size={10} className="mx-1" />{" "}
                          {episode.duration}
                        </p>
                      </div>
                      <div className="p-2 text-indigo-600">
                        {isAdded ? (
                          <CheckCircle2 size={20} className="text-gray-400" />
                        ) : (
                          <Plus size={20} />
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <Search size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">
                    {episodeSearchQuery
                      ? "No episodes found."
                      : "Type to search episodes..."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT PATH MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Edit Path Details
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdatePath} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Path Name
                </label>
                <input
                  required
                  type="text"
                  className="input input-bordered w-full rounded-xl"
                  value={editPathName}
                  onChange={(e) => setEditPathName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="textarea textarea-bordered w-full rounded-xl resize-none"
                  value={editPathDesc}
                  onChange={(e) => setEditPathDesc(e.target.value)}
                />
              </div>

              <div
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer"
                onClick={() => setIsEditPathPublic(!isEditPathPublic)}
              >
                <div
                  className={`w-6 h-6 rounded-md border flex items-center justify-center ${isEditPathPublic ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-300"}`}
                >
                  {isEditPathPublic && (
                    <CheckCircle2 size={16} className="text-white" />
                  )}
                </div>
                <div>
                  <span className="block text-sm font-bold text-gray-900">
                    Make Public
                  </span>
                  <span className="block text-xs text-gray-500">
                    Allow other users to discover and follow this path.
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-ghost flex-1 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary flex-1 rounded-xl shadow-lg shadow-indigo-200"
                >
                  {isSaving && (
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  )}
                  Save Changes
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
