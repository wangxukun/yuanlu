"use client";

import React, { useState } from "react";
import { Episode } from "@/core/episode/episode.entity";
import { MergedSubtitleItem } from "@/components/episode/transcript/types";
import FullContentTranscript from "./FullContentTranscript";

export default function ImmersiveCard({
  episode,
  subtitles,
}: {
  episode: Episode;
  subtitles: MergedSubtitleItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <section>
        <div className="card bg-primary-600 text-white shadow-xl rounded-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="card-body p-8 md:p-10 relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-bold text-white">想要看字幕？</h3>
              <p className="text-white/80">
                开启全屏沉浸模式，享受无干扰的听力训练
              </p>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="btn bg-white hover:bg-ink-100 text-primary border-none btn-lg rounded-xl font-bold shrink-0 shadow-lg"
            >
              立即进入沉浸模式
            </button>
          </div>
        </div>
      </section>

      <FullContentTranscript
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        subtitles={subtitles}
        episode={episode}
      />
    </>
  );
}
