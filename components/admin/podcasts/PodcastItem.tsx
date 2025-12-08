import { useState, useEffect } from "react";
import Image from "next/image";
import { Podcast } from "@/core/podcast/podcast.entity";
import { Episode } from "@/core/episode/episode.entity";

export default function PodcastItem({ podcast }: { podcast: Podcast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && episodes.length === 0 && !isLoading) {
      loadEpisodes();
    }
  }, [isOpen]);

  const loadEpisodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/episode/list-by-podcastid?podcastId=${podcast.podcastid}`,
      );
      const data = await response.json();
      setEpisodes(data);
    } catch (error) {
      console.error("Error loading episodes:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="collapse collapse-arrow bg-base-200 my-4">
      <input
        type="checkbox"
        className="absolute left-0 opacity-0 z-10 cursor-pointer"
        checked={isOpen}
        onChange={() => setIsOpen(!isOpen)}
        style={{
          width: "3rem", // 控制可点击区域宽度
          height: "3rem", // 控制可点击区域高度
        }}
      />
      {/* 带左侧箭头的标题区域 */}
      <div className="collapse-title cursor-auto !pl-14 relative">
        {" "}
        {/* 增加左侧 padding */}
        <div className="absolute left-4 -translate-y-1/2 top-1/2">
          {/* 自定义箭头图标 */}
          <svg
            className={`w-6 h-6 transition-transform ${isOpen ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
        <table className="table">
          <tbody>
            <tr>
              <td>
                <div className="flex items-center gap-3">
                  <div className="avatar">
                    <div className="mask mask-squircle h-12 w-12">
                      <Image
                        src={podcast.coverUrl || "/static/images/1.png"}
                        alt={`${podcast.title}封面`}
                        width={60}
                        height={60}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold">{podcast.title}</div>
                    <div className="text-sm opacity-50">{podcast.platform}</div>
                  </div>
                </div>
              </td>
              <td>{podcast.description.slice(0, 40) + "..."}</td>
              <td>
                {podcast.tags.length > 0 &&
                  podcast.tags.map((tag) => {
                    return (
                      <div key={tag.tag.tagid} className="badge badge-neutral">
                        {tag.tag.name}
                      </div>
                    );
                  })}
              </td>
              <td>
                <div className="badge badge-success">
                  {podcast.isEditorPick ? "编辑推荐" : ""}
                </div>
              </td>
              <th>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={(e) => e.stopPropagation()} // 阻止冒泡
                >
                  删除
                </button>
              </th>
            </tr>
          </tbody>
        </table>
      </div>
      {/* 懒加载内容 */}
      <div className="collapse-content">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : (
          <div className="space-y-2">
            {episodes.map((episode) => (
              <div
                key={episode.episodeid}
                className="bg-base-100 p-4 rounded-lg shadow-sm"
              >
                {episode.title}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
