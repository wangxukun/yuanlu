import React from "react";
import Link from "next/link";
import Image from "next/image";

interface PodcastCardProps {
  podcastId: string;
  coverUrl: string;
  title: string;
  platform?: string;
  badge?: React.ReactNode;
  metaFields?: React.ReactNode[];
  className?: string;
}

export default function PodcastCard({
  podcastId,
  coverUrl,
  title,
  platform,
  badge,
  metaFields = [],
  className = "",
}: PodcastCardProps) {
  return (
    <Link
      href={`/podcast/${podcastId}`}
      className={`block group cursor-pointer ${className}`}
    >
      <div className="rounded-xl transition-shadow relative">
        {/* Badge Slot */}
        {badge && <div className="absolute top-2 left-2 z-10">{badge}</div>}

        {/* Cover Image */}
        <div className="aspect-square rounded-lg overflow-hidden mb-3 relative bg-base-200 shadow-e1 border border-base-200">
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Platform tag */}
        <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-1 truncate">
          {platform || "播客"}
        </p>

        {/* Title */}
        <h3 className="text-base font-bold text-ink-900 dark:text-ink-100 mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors">
          {title}
        </h3>

        {/* Meta row */}
        {metaFields.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-ink-500 font-medium overflow-hidden">
            {metaFields.map((field, index) => (
              <React.Fragment key={index}>
                <span className="flex items-center gap-1 truncate">
                  {field}
                </span>
                {index < metaFields.length - 1 && (
                  <span className="flex-none w-1 h-1 rounded-full bg-ink-300 dark:bg-ink-600"></span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
