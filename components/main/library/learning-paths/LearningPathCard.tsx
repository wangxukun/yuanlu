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
      className="group bg-white dark:bg-ink-900 rounded-lg overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={onClick}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-ink-100 dark:bg-ink-800">
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
            <span className="flex items-center gap-1 px-2 py-1 bg-primary-600 dark:bg-primary-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
              <BadgeCheck size={12} /> Official
            </span>
          ) : (
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
            // [Refactor] text-ink-900 -> text-base-content, hover:text-primary
            className="text-lg font-bold text-base-content leading-tight group-hover:text-primary transition-colors line-clamp-1"
            title={path.pathName}
          >
            {path.pathName}
          </h3>
          {/* [Refactor] text-ink-300 -> text-base-content/30 */}
          <button className="text-base-content/30 hover:text-base-content/60 transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>

        {/* [Refactor] text-ink-500 -> text-base-content/60 */}
        <p className="text-sm text-base-content/60 line-clamp-2 mb-4 flex-1">
          {path.description || "No description provided."}
        </p>

        {/* Progress Bar (User paths only) */}
        {!path.isOfficial && path.progress !== undefined && (
          <div className="mb-4">
            {/* [Refactor] text-ink-400 -> text-base-content/40 */}
            <div className="flex justify-between text-xs font-medium text-base-content/40 mb-1">
              <span>进度</span>
              <span>{path.progress}%</span>
            </div>
            {/* [Refactor] bg-ink-100 -> bg-base-200 */}
            <div className="h-1.5 w-full bg-base-200 rounded-full overflow-hidden">
              <div
                // [Refactor] bg-primary-500 -> bg-primary
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${path.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="pt-4 flex items-center justify-between text-xs font-medium text-base-content/40">
          <div className="flex items-center">
            <Layers size={14} className="mr-1.5" />
            {path.itemCount} 集
          </div>
          <div className="flex items-center">{path.creatorName}</div>
        </div>
      </div>
    </div>
  );
};

export default LearningPathCard;
