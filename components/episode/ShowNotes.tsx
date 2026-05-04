"use client";

import React, { useState, useRef, useEffect } from "react";
import { Episode } from "@/core/episode/episode.entity";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function ShowNotes({ episode }: { episode: Episode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (contentRef.current) {
        const { scrollHeight, clientHeight } = contentRef.current;
        // 只有在未展开状态下，scrollHeight > clientHeight 才表示被截断
        setIsTruncated(scrollHeight > clientHeight);
      }
    };

    // 延迟执行以确保渲染完成
    const timer = setTimeout(checkTruncation, 100);
    window.addEventListener("resize", checkTruncation);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkTruncation);
    };
  }, [episode.description, isExpanded]);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold border-b border-slate-200 dark:border-slate-800 pb-4 text-slate-900 dark:text-slate-50">
        节目介绍
      </h2>
      <article className="text-lg text-slate-600 dark:text-slate-300 space-y-6 leading-relaxed font-serif relative">
        <div
          ref={contentRef}
          className={`[&>p]:mb-6 [&>p]:leading-relaxed [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-6 [&>blockquote]:py-2 [&>blockquote]:italic [&>blockquote]:bg-slate-50 [&>blockquote]:dark:bg-slate-900/50 [&>blockquote]:rounded-r-xl [&>blockquote]:my-6 [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 transition-all duration-300 ${
            !isExpanded ? "line-clamp-3 md:line-clamp-none overflow-hidden" : ""
          }`}
          dangerouslySetInnerHTML={{ __html: episode.description || "" }}
        />

        {/* Mobile "Show All" Toggle */}
        {!isExpanded && isTruncated && (
          <div className="md:hidden absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#f9f9ff] dark:from-slate-950 to-transparent flex items-end justify-center pb-0">
            <button
              onClick={() => setIsExpanded(true)}
              className="text-[#5830E0] font-bold text-sm flex items-center gap-1 bg-[#f9f9ff] dark:bg-slate-950 px-4 py-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-800"
            >
              显示全部
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="md:hidden text-[#5830E0] font-bold text-sm flex items-center gap-1 self-center mt-2"
          >
            收起内容
            <ChevronUp className="w-4 h-4" />
          </button>
        )}
      </article>
    </section>
  );
}
