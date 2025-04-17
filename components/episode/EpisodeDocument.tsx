"use client";
import React, { useState, useEffect } from "react";

interface SubtitleItem {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

export default function EpisodeDocument({
  subtitle,
}: {
  subtitle: SubtitleItem[];
}) {
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSubtitles(subtitle);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch subtitles:", err);
      setError("Failed to load subtitles. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [subtitles]);

  // 格式化时间显示 (HH:MM:SS)
  const formatTime = (timeStr: string): string => {
    return timeStr.split(",")[0]; // 去掉毫秒部分
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (subtitles.length === 0) {
    return (
      <div className="bg-gray-50 border-l-4 border-gray-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-700">本集没有字幕</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] rounded-lg overflow-hidden">
      <div className="py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-slate-500">剧集字幕</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {subtitles.map((subtitle) => (
          <div
            key={subtitle.id}
            className="px-6 group/item py-4 hover:bg-gray-100 transition-colors duration-150"
          >
            <div className="hidden group-hover/item:inline-block hover:cursor-pointer flex items-baseline mb-1">
              <span className="text-xs font-mono text-gray-500 mr-2">
                {formatTime(subtitle.startTime)}
              </span>
              <span className="text-xs font-mono text-gray-500">
                - {formatTime(subtitle.endTime)}
              </span>
            </div>
            <p className="text-gray-800 leading-relaxed">{subtitle.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
