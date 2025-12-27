import React from "react";
import Image from "next/image";
import { ArrowRightIcon, PlayIcon } from "@heroicons/react/24/solid";
import { ClockIcon as ClockOutlineIcon } from "@heroicons/react/24/outline";

// Mock Data moved here
const MOCK_RECOMMENDED_PODCASTS = [
  {
    id: "101",
    title: "Modern History",
    author: "History Buffs",
    category: "History",
    duration: "45 min",
    thumbnailUrl: "/static/images/episode-dark.png",
  },
  {
    id: "102",
    title: "Culinary Secrets",
    author: "Chef Gordon",
    category: "Food",
    duration: "32 min",
    thumbnailUrl: "/static/images/podcast-light.png",
  },
  {
    id: "103",
    title: "Space Exploration",
    author: "NASA Fan",
    category: "Science",
    duration: "58 min",
    thumbnailUrl: "/static/images/podcast-dark.png",
  },
  {
    id: "104",
    title: "Mindfulness 101",
    author: "Peaceful Mind",
    category: "Health",
    duration: "20 min",
    thumbnailUrl: "/static/images/episode-light.png",
  },
];

interface RecommendedPodcastsProps {
  onPlay: (id: string) => void;
}

export default function RecommendedPodcasts({
  onPlay,
}: RecommendedPodcastsProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold text-base-content">推荐给你</h2>
          <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
            中级
          </span>
        </div>
        <button className="p-1 rounded-full hover:bg-base-200 transition-colors">
          <ArrowRightIcon className="w-5 h-5 text-base-content/40" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MOCK_RECOMMENDED_PODCASTS.map((podcast) => (
          <div key={podcast.id} className="group flex flex-col">
            <div className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-base-200">
              <Image
                src={podcast.thumbnailUrl}
                alt={podcast.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md flex items-center">
                <ClockOutlineIcon className="w-3 h-3 mr-1" />
                {podcast.duration}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <button
                  onClick={() => onPlay(podcast.id)}
                  className="bg-white/90 text-indigo-600 rounded-full p-3 shadow-lg hover:scale-110 transition-transform border-none"
                >
                  <PlayIcon className="w-8 h-8 fill-indigo-600 text-indigo-600 ml-0.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                {podcast.category}
              </span>
              <h3 className="font-bold text-base-content leading-tight group-hover:text-primary transition-colors line-clamp-1">
                {podcast.title}
              </h3>
              <p className="text-sm text-base-content/60">{podcast.author}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
