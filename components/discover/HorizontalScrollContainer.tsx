"use client";

import React, { useRef } from "react";
import Link from "next/link";

interface HorizontalScrollContainerProps {
  title: string;
  viewMoreLink?: string;
  viewMoreText?: string;
  children: React.ReactNode;
}

export default function HorizontalScrollContainer({
  title,
  viewMoreLink,
  viewMoreText = "查看更多",
  children,
}: HorizontalScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -288, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 288, behavior: "smooth" });
    }
  };

  return (
    <section className="mb-16">
      <div className="flex items-end justify-between mb-8">
        <div className="flex items-baseline gap-4">
          <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">
            {title}
          </h2>
          {viewMoreLink && (
            <Link
              href={viewMoreLink}
              className="text-primary-600 dark:text-primary-400 text-sm font-semibold hover:underline hidden sm:block"
            >
              {viewMoreText}
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          {viewMoreLink && (
            <Link
              href={viewMoreLink}
              className="text-primary-600 dark:text-primary-400 text-sm font-semibold hover:underline sm:hidden mr-2 self-center"
            >
              {viewMoreText}
            </Link>
          )}
          <button
            onClick={scrollLeft}
            className="w-10 h-10 rounded-full bg-white dark:bg-ink-800 flex items-center justify-center text-ink-400 hover:text-primary-600 shadow-sm border border-ink-100 dark:border-ink-700"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            onClick={scrollRight}
            className="w-10 h-10 rounded-full bg-white dark:bg-ink-800 flex items-center justify-center text-ink-400 hover:text-primary-600 shadow-sm border border-ink-100 dark:border-ink-700"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-8 overflow-x-auto scrollbar-none pb-4 -mx-6 px-6 lg:mx-0 lg:px-0"
      >
        {children}
      </div>
    </section>
  );
}
