import React from "react";
import Link from "next/link";
import Image from "next/image";

interface ChannelCardProps {
  name: string;
  coverUrl: string;
  podcastCount: number;
  episodeCount: number;
  className?: string;
}

/** 集数展示格式：万位以上缩写，避免长数字撑破卡片 */
export function formatEpisodeCount(count: number): string {
  if (count >= 10000) {
    const wan = (count / 10000).toFixed(1).replace(/\.0$/, "");
    return `${wan}万`;
  }
  return `${count}`;
}

export default function ChannelCard({
  name,
  coverUrl,
  podcastCount,
  episodeCount,
  className = "",
}: ChannelCardProps) {
  // coverUrl 由服务端解析：频道品牌横幅（OSS 签名）或代表节目封面；兜底品牌色字标
  const hasCover = coverUrl && coverUrl !== "default_cover_url";
  const resolvedCover = hasCover
    ? coverUrl
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1F7A5C&color=fff&size=256`;

  return (
    <Link
      href={`/channel/${encodeURIComponent(name)}`}
      className={`block group cursor-pointer h-full ${className}`}
    >
      <div className="bg-primary-50 dark:bg-primary-900/10 rounded-xl overflow-hidden border border-primary-100/70 dark:border-primary-900/20 hover:scale-[1.02] hover:shadow-e1 transition-all duration-300 h-full flex flex-col">
        {/* Channel banner cover */}
        <div className="relative aspect-[16/9] bg-base-200">
          <Image
            src={resolvedCover}
            alt={`${name} 频道封面`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        <div className="p-4 flex flex-col flex-1">
          {/* Channel label */}
          <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-1">
            频道 Channel
          </p>

          {/* Channel name */}
          <h3 className="text-base font-bold text-ink-900 dark:text-ink-100 line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {name}
          </h3>

          {/* Meta row: 总集数为主；档数较少时不展示，避免放大资源量小的观感 */}
          <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400 font-medium mt-2 overflow-hidden">
            <span className="flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-[14px]">
                podcasts
              </span>
              {formatEpisodeCount(episodeCount)} 集
            </span>
            {podcastCount >= 3 && (
              <>
                <span className="flex-none w-1 h-1 rounded-full bg-ink-300 dark:bg-ink-600"></span>
                <span className="flex items-center gap-1 truncate">
                  {podcastCount} 档节目
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
