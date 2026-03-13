import { useEffect, useState, useRef } from "react";
import { ProcessedSubtitle } from "./types";

export function useTranscriptScroll(
  audioRef: HTMLAudioElement | null,
  isPlaying: boolean,
  isPlayingThisEpisode: boolean,
  processedSubtitles: ProcessedSubtitle[],
  currentTime: number,
  autoScroll: boolean,
) {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const rafRef = useRef<number | null>(null);
  const activeIndexRef = useRef<number>(-1);

  // 1. Sync Highlight Logic
  useEffect(() => {
    if (!isPlayingThisEpisode || !isPlaying || !audioRef) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let lastFoundIndex =
      activeIndexRef.current >= 0 ? activeIndexRef.current : 0;

    const loop = () => {
      const t = audioRef.currentTime;
      let foundIndex = -1;

      const currentSub = processedSubtitles[lastFoundIndex];
      if (currentSub && t >= currentSub.start && t <= currentSub.end) {
        foundIndex = lastFoundIndex;
      } else {
        if (currentSub && t > currentSub.end) {
          for (let i = lastFoundIndex + 1; i < processedSubtitles.length; i++) {
            if (
              t >= processedSubtitles[i].start &&
              t <= processedSubtitles[i].end
            ) {
              foundIndex = i;
              lastFoundIndex = i;
              break;
            }
            if (t < processedSubtitles[i].start) break;
          }
        } else {
          foundIndex = processedSubtitles.findIndex(
            (sub) => t >= sub.start && t <= sub.end,
          );
          if (foundIndex !== -1) lastFoundIndex = foundIndex;
        }
      }

      if (foundIndex !== activeIndexRef.current) {
        setActiveIndex(foundIndex);
        activeIndexRef.current = foundIndex;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, isPlayingThisEpisode, audioRef, processedSubtitles]);

  // 2. Fallback when not playing but time changed
  useEffect(() => {
    if (isPlayingThisEpisode && !isPlaying) {
      const index = processedSubtitles.findIndex(
        (sub) => currentTime >= sub.start && currentTime <= sub.end,
      );
      if (index !== activeIndex) {
        setActiveIndex(index);
        activeIndexRef.current = index;
      }
    }
    if (!isPlayingThisEpisode && activeIndex !== -1) {
      setActiveIndex(-1);
      activeIndexRef.current = -1;
    }
  }, [
    currentTime,
    isPlaying,
    isPlayingThisEpisode,
    processedSubtitles,
    activeIndex,
  ]);

  // 3. Scroll tracking function
  const getScrollParent = (node: HTMLElement): HTMLElement | Window => {
    let parent = node.parentElement;
    while (parent) {
      const { overflowY } = window.getComputedStyle(parent);
      if (overflowY.includes("auto") || overflowY.includes("scroll")) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return window;
  };

  // 4. Auto scroll logic (with Window Bug Fix)
  useEffect(() => {
    if (!autoScroll || activeIndex === -1) return;

    const activeEl = document.getElementById(
      `subtitle-${processedSubtitles[activeIndex]?.id}`,
    );

    if (activeEl) {
      const container = getScrollParent(activeEl);
      const activeRect = activeEl.getBoundingClientRect();

      if (container === window) {
        // [BUG FIX]: Previously this was an early return. Now we perform the logic on window
        const safetyTop = 120; // some reasonable top margin
        const safetyBottom = window.innerHeight - window.innerHeight * 0.35;

        // Only scroll if the element is too close to top or bottom
        if (activeRect.top < safetyTop || activeRect.bottom > safetyBottom) {
          const targetScreenPos = window.innerHeight * 0.3; // aim to put it at top 30% of screen
          const offset = activeRect.top - targetScreenPos;

          window.scrollTo({
            top: window.scrollY + offset,
            behavior: "smooth",
          });
        }
      } else {
        const scrollContainer = container as HTMLElement;
        const containerRect = scrollContainer.getBoundingClientRect();

        const safetyTop = containerRect.top + 120;
        const safetyBottom = containerRect.bottom - containerRect.height * 0.35;

        if (activeRect.top < safetyTop || activeRect.bottom > safetyBottom) {
          const targetScreenPos = containerRect.height * 0.3;
          const offset = activeRect.top - containerRect.top - targetScreenPos;

          scrollContainer.scrollTo({
            top: scrollContainer.scrollTop + offset,
            behavior: "smooth",
          });
        }
      }
    }
  }, [activeIndex, autoScroll, processedSubtitles]);

  return { activeIndex, setActiveIndex };
}
