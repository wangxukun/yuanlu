import React from "react";
import Image from "next/image";
import {
  PlayCircleIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import { MOCK_RECENT_PODCASTS } from "./mock-data";

export default function RecentHistory() {
  return (
    <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
      <div className="p-6 border-b border-base-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-base-content">最近听过</h3>
        <button className="text-sm text-primary hover:text-primary-focus font-medium">
          查看全部
        </button>
      </div>
      <div className="divide-y divide-base-200">
        {MOCK_RECENT_PODCASTS.map((podcast) => (
          <div
            key={podcast.id}
            className="p-4 flex items-center hover:bg-base-200/50 transition-colors group"
          >
            <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-base-300">
              <Image
                src={podcast.thumbnailUrl}
                alt={podcast.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayCircleIcon className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="ml-4 flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-base-content truncate">
                {podcast.title}
              </h4>
              <p className="text-sm text-base-content/60 mb-1">
                {podcast.author}
              </p>

              {/* Progress Bar */}
              <div className="flex items-center space-x-3">
                <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${podcast.progress}%` }}
                  ></div>
                </div>
                <span className="text-xs text-base-content/40 font-medium w-8 text-right">
                  {podcast.progress === 100 ? "Done" : `${podcast.progress}%`}
                </span>
              </div>
            </div>

            <div className="ml-4 flex-shrink-0">
              <button className="p-2 text-base-content/40 hover:text-base-content hover:bg-base-200 rounded-full transition-colors">
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
