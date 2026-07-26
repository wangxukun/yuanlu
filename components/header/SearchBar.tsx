// components/header/SearchBar.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import Image from "next/image";
import type {
  PodcastSearchResultDto,
  PodcastSearchResponseDto,
} from "@/core/podcast/podcast-search.dto";

const SUGGESTION_LIMIT = 5;

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PodcastSearchResultDto[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search for suggestions
  const fetchSuggestions = useDebouncedCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/podcast/search?q=${encodeURIComponent(term)}&limit=${SUGGESTION_LIMIT}`,
      );
      const data: PodcastSearchResponseDto = await res.json();
      if (data.success) {
        setResults(data.data);
        setIsOpen(data.data.length > 0);
      }
    } catch (err) {
      console.error("[SearchBar] fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setActiveIndex(-1);
    fetchSuggestions(value);
  };

  // Navigate to full search results page
  const navigateToSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return;
      setIsOpen(false);
      inputRef.current?.blur();
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    },
    [router],
  );

  // Navigate to podcast detail
  const navigateToPodcast = useCallback(
    (podcastId: string) => {
      setIsOpen(false);
      setQuery("");
      inputRef.current?.blur();
      router.push(`/podcast/${podcastId}`);
    },
    [router],
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter") {
        navigateToSearch(query);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          navigateToPodcast(results[activeIndex].podcastid);
        } else {
          // Last item or no selection => full search
          navigateToSearch(query);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Highlight matched text
  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const regex = new RegExp(
      `(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-sm px-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <div ref={containerRef} className="relative w-96 hidden md:block">
      {/* Input */}
      <input
        ref={inputRef}
        id="global-search-input"
        className="w-full h-12 bg-ink-100 dark:bg-ink-800 border-none rounded-full px-6 pl-12 text-sm focus:ring-2 focus:ring-primary-500/20 transition-shadow outline-none text-ink-700 dark:text-ink-200"
        placeholder={"搜索\u201c日常生活\u201d或\u201c新闻\u201d……"}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        autoComplete="off"
      />
      <span className="material-symbols-outlined absolute left-4 top-3 text-ink-400 pointer-events-none">
        search
      </span>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-4 top-3.5">
          <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-ink-800 rounded-2xl shadow-2xl shadow-ink-900/10 dark:shadow-black/30 border border-ink-200 dark:border-ink-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="py-2" role="listbox">
            {results.map((podcast, index) => (
              <li
                key={podcast.podcastid}
                role="option"
                aria-selected={activeIndex === index}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  activeIndex === index
                    ? "bg-primary-50 dark:bg-primary-900/20"
                    : "hover:bg-ink-50 dark:hover:bg-ink-700/50"
                }`}
                onClick={() => navigateToPodcast(podcast.podcastid)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {/* Cover thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-ink-200 dark:bg-ink-700 relative">
                  <Image
                    src={podcast.coverUrl}
                    alt={podcast.title}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 dark:text-ink-100 truncate">
                    {highlightMatch(podcast.title, query)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {podcast.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag.id}
                        className="text-[10px] text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded-full font-medium"
                      >
                        {tag.name}
                      </span>
                    ))}
                    <span className="text-[10px] text-ink-400">
                      {podcast.episodeCount} 集
                    </span>
                  </div>
                </div>
                {/* Arrow icon */}
                <span className="material-symbols-outlined text-ink-300 dark:text-ink-600 text-lg flex-shrink-0">
                  chevron_right
                </span>
              </li>
            ))}
          </ul>

          {/* "View all results" button */}
          <button
            onClick={() => navigateToSearch(query)}
            onMouseEnter={() => setActiveIndex(results.length)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-t border-ink-100 dark:border-ink-700 ${
              activeIndex === results.length
                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                : "text-primary-600 dark:text-primary-400 hover:bg-ink-50 dark:hover:bg-ink-700/50"
            }`}
          >
            <span className="material-symbols-outlined text-lg">search</span>
            搜索 &ldquo;{query}&rdquo; 的全部结果
          </button>
        </div>
      )}
    </div>
  );
}
