import React from "react";
import Image from "next/image";
import {
  PlayCircle,
  MoreVertical,
  Layers,
  Lock,
  Globe,
  BadgeCheck,
} from "lucide-react";

// 定义接口以匹配传入的数据结构
export interface LearningPath {
  pathid: number;
  pathName: string;
  description?: string | null;
  coverUrl?: string | null;
  isOfficial?: boolean;
  isPublic: boolean;
  progress?: number; // 0-100
  itemCount: number;
  creatorName: string;
  creationAt: Date;
}

interface LearningPathCardProps {
  path: LearningPath;
  onClick: () => void;
  onPlay: (e: React.MouseEvent) => void;
}

const LearningPathCard: React.FC<LearningPathCardProps> = ({
  path,
  onClick,
  onPlay,
}) => {
  return (
    <div
      // [Refactor] bg-white -> bg-base-100, border-gray-100 -> border-base-200
      className="group bg-base-100 rounded-3xl border border-base-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={onClick}
    >
      {/* Cover Image Area */}
      {/* [Refactor] bg-gray-100 -> bg-base-300 (更通用的图片占位色) */}
      <div className="relative aspect-[16/9] overflow-hidden bg-base-300">
        <Image
          src={
            path.coverUrl ||
            `https://ui-avatars.com/api/?name=${path.pathName}&background=random&color=fff`
          }
          alt={path.pathName}
          fill
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={onPlay}
            // 遮罩层按钮保持固定亮色设计，因为背景固定为黑色遮罩
            className="flex items-center space-x-2 bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-2 rounded-full font-bold hover:bg-white/30 transition-colors"
          >
            <PlayCircle size={20} />
            <span>Play All</span>
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {path.isOfficial ? (
            // [Refactor] bg-indigo-600 -> bg-primary
            <span className="flex items-center gap-1 px-2 py-1 bg-primary/90 backdrop-blur-md text-primary-content text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm">
              <BadgeCheck size={12} /> Official
            </span>
          ) : (
            // 私有/公开徽章保持深色背景高对比度
            <span className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-md border border-white/10">
              {path.isPublic ? <Globe size={12} /> : <Lock size={12} />}
              {path.isPublic ? "Public" : "Private"}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3
            // [Refactor] text-gray-900 -> text-base-content, hover:text-primary
            className="text-lg font-bold text-base-content leading-tight group-hover:text-primary transition-colors line-clamp-1"
            title={path.pathName}
          >
            {path.pathName}
          </h3>
          {/* [Refactor] text-gray-300 -> text-base-content/30 */}
          <button className="text-base-content/30 hover:text-base-content/60 transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>

        {/* [Refactor] text-gray-500 -> text-base-content/60 */}
        <p className="text-sm text-base-content/60 line-clamp-2 mb-4 flex-1">
          {path.description || "No description provided."}
        </p>

        {/* Progress Bar (User paths only) */}
        {!path.isOfficial && path.progress !== undefined && (
          <div className="mb-4">
            {/* [Refactor] text-gray-400 -> text-base-content/40 */}
            <div className="flex justify-between text-xs font-medium text-base-content/40 mb-1">
              <span>Progress</span>
              <span>{path.progress}%</span>
            </div>
            {/* [Refactor] bg-gray-100 -> bg-base-200 */}
            <div className="h-1.5 w-full bg-base-200 rounded-full overflow-hidden">
              <div
                // [Refactor] bg-indigo-500 -> bg-primary
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${path.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        {/* [Refactor] border-gray-50 -> border-base-200, text-gray-400 -> text-base-content/40 */}
        <div className="pt-4 border-t border-base-200 flex items-center justify-between text-xs font-medium text-base-content/40">
          <div className="flex items-center">
            <Layers size={14} className="mr-1.5" />
            {path.itemCount} Items
          </div>
          <div className="flex items-center">{path.creatorName}</div>
        </div>
      </div>
    </div>
  );
};

export default LearningPathCard;
