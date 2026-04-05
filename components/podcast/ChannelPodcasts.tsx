"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

// ---------------------- Types ----------------------
export interface ChannelPodcastItem {
  podcastid: string;
  title: string;
  coverUrl: string;
  platform: string | null;
  totalPlays: number;
  episodeCount: number;
  tags: Array<{ id: number; name: string }>;
}

interface ChannelPodcastsProps {
  channelName: string;
  podcasts: ChannelPodcastItem[];
}

// ---------------------- Sub-components ----------------------

/** Single podcast card in the horizontal scroll */
function PodcastScrollCard({ podcast }: { podcast: ChannelPodcastItem }) {
  return (
    <Link
      href={`/podcast/${podcast.podcastid}`}
      className="flex-shrink-0 w-36 sm:w-40 lg:w-44 group"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-base-200 border border-base-200/50 mb-3 shadow-sm group-hover:shadow-md transition-all duration-300">
        <Image
          src={podcast.coverUrl}
          alt={podcast.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </div>
      <h3 className="text-sm font-bold text-base-content line-clamp-1 group-hover:text-primary transition-colors">
        {podcast.title}
      </h3>
      <div className="flex items-center gap-1.5 mt-1 text-xs text-base-content/50">
        {podcast.tags?.[0] && <span>{podcast.tags[0].name}</span>}
        {podcast.tags?.[0] && <span>·</span>}
        <span>{podcast.episodeCount} 集</span>
      </div>
    </Link>
  );
}

// ---------------------- Main Component ----------------------

export default function ChannelPodcasts({
  channelName,
  podcasts,
}: ChannelPodcastsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll state
  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", updateScrollState, { passive: true });
      // Also check on resize
      window.addEventListener("resize", updateScrollState);
    }
    return () => {
      el?.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [podcasts]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.7;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!podcasts || podcasts.length === 0) return null;

  const showArrows = canScrollLeft || canScrollRight;

  return (
    <div className="bg-base-100/80 backdrop-blur-xl rounded-[2rem] p-6 lg:p-10 shadow-sm border border-base-200/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
          {channelName}
          <span className="bg-primary/10 text-primary text-xs px-2.5 py-0.5 rounded-full font-bold">
            频道
          </span>
        </h3>
        {/* <Link
          href={`/channel/${encodeURIComponent(channelName)}`}
          className="flex items-center gap-1 text-sm font-medium text-base-content/60 hover:text-primary transition-colors"
        >
          查看频道
          <ChevronRightIcon className="w-4 h-4" />
        </Link> */}
      </div>

      {/* Scrollable area with optional arrows */}
      <div className="relative group/scroll">
        {/* Left arrow */}
        {showArrows && (
          <button
            onClick={() => scroll("left")}
            className={`absolute left-0 top-[72px] sm:top-[80px] lg:top-[88px] -translate-y-1/2 -translate-x-[calc(100%+4px)] z-10 w-7 h-14 rounded-xl bg-base-100 border border-base-200 shadow-lg flex items-center justify-center transition-all duration-200 hover:bg-primary hover:text-primary-content hover:border-primary hover:shadow-xl active:scale-90 ${
              canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            aria-label="向左滚动"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        )}

        {/* Right arrow */}
        {showArrows && (
          <button
            onClick={() => scroll("right")}
            className={`absolute right-0 top-[72px] sm:top-[80px] lg:top-[88px] -translate-y-1/2 translate-x-[calc(100%+4px)] z-10 w-7 h-14 rounded-xl bg-base-100 border border-base-200 shadow-lg flex items-center justify-center transition-all duration-200 hover:bg-primary hover:text-primary-content hover:border-primary hover:shadow-xl active:scale-90 ${
              canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            aria-label="向右滚动"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        )}

        {/* Cards container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth"
        >
          {podcasts.map((podcast) => (
            <PodcastScrollCard key={podcast.podcastid} podcast={podcast} />
          ))}
        </div>
      </div>
    </div>
  );
}
