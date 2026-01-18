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
      className="group bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={onClick}
    >
      {/* Cover Image Area */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
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
            className="flex items-center space-x-2 bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-2 rounded-full font-bold hover:bg-white/30 transition-colors"
          >
            <PlayCircle size={20} />
            <span>Play All</span>
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {path.isOfficial ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm">
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
            className="text-lg font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1"
            title={path.pathName}
          >
            {path.pathName}
          </h3>
          <button className="text-gray-300 hover:text-gray-600">
            <MoreVertical size={16} />
          </button>
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
          {path.description || "No description provided."}
        </p>

        {/* Progress Bar (User paths only) */}
        {!path.isOfficial && path.progress !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-xs font-medium text-gray-400 mb-1">
              <span>Progress</span>
              <span>{path.progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${path.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-medium text-gray-400">
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
