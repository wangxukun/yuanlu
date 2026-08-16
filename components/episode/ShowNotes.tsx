"use client";

import React, { useState, useRef, useEffect } from "react";
import { Episode } from "@/core/episode/episode.entity";
import { ChevronDown, ChevronUp, Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { handleDictionaryQuotaBlock } from "@/lib/client/dictionary-quota";

export default function ShowNotes({ episode }: { episode: Episode }) {
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isTranslatingDesc, setIsTranslatingDesc] = useState(false);
  const [translatedDesc, setTranslatedDesc] = useState("");
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
  }, [episode.description, isExpanded, translatedDesc]);

  const handleTranslateDesc = async () => {
    if (translatedDesc) {
      setTranslatedDesc("");
      return;
    }
    if (!episode.description) return;

    try {
      setIsTranslatingDesc(true);
      const res = await fetch("/api/dictionary/youdao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: episode.description }),
      });
      const data = await res.json();
      if (handleDictionaryQuotaBlock(data)) return;
      if (res.ok && data.definition) {
        setTranslatedDesc(data.definition);
      } else {
        if (!session?.user) {
          (
            document.getElementById(
              "email_check_modal_box",
            ) as HTMLDialogElement
          )?.showModal();
        } else {
          toast.error("翻译失败，请稍后重试");
        }
      }
    } catch {
      if (!session?.user) {
        (
          document.getElementById("email_check_modal_box") as HTMLDialogElement
        )?.showModal();
      } else {
        toast.error("翻译请求出错");
      }
    } finally {
      setIsTranslatingDesc(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-ink-200 dark:border-ink-800 pb-4">
        <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-50">
          节目介绍
        </h2>
        <button
          onClick={handleTranslateDesc}
          disabled={isTranslatingDesc}
          className={`p-2 rounded-xl transition-all ${
            translatedDesc
              ? "bg-[#1F7A5C]/10 text-[#1F7A5C]"
              : "text-ink-400 hover:text-[#1F7A5C] hover:bg-[#1F7A5C]/5"
          }`}
          title="翻译"
        >
          {isTranslatingDesc ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Languages className="w-5 h-5" />
          )}
        </button>
      </div>
      <article className="text-lg text-ink-600 dark:text-ink-300 space-y-6 leading-relaxed font-serif relative">
        <div
          ref={contentRef}
          className={`[&>p]:mb-6 [&>p]:leading-relaxed [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-6 [&>blockquote]:py-2 [&>blockquote]:italic [&>blockquote]:bg-ink-50 [&>blockquote]:dark:bg-ink-900/50 [&>blockquote]:rounded-r-xl [&>blockquote]:my-6 [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 transition-all duration-300 ${
            !isExpanded ? "line-clamp-3 md:line-clamp-none overflow-hidden" : ""
          }`}
          dangerouslySetInnerHTML={{
            __html: translatedDesc || episode.description || "",
          }}
        />

        {/* Mobile "Show All" Toggle */}
        {!isExpanded && isTruncated && (
          <div className="md:hidden absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#f9f9ff] dark:from-ink-950 to-transparent flex items-end justify-center pb-0">
            <button
              onClick={() => setIsExpanded(true)}
              className="text-[#1F7A5C] font-bold text-sm flex items-center gap-1 bg-ink-50 dark:bg-ink-950 px-4 py-1 rounded-full shadow-sm border border-ink-100 dark:border-ink-800"
            >
              显示全部
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="md:hidden text-[#1F7A5C] font-bold text-sm flex items-center gap-1 self-center mt-2"
          >
            收起内容
            <ChevronUp className="w-4 h-4" />
          </button>
        )}
      </article>
    </section>
  );
}
