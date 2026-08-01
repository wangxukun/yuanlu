"use client";

import { useEffect } from "react";

interface TranscriptKeyboardHandlers {
  onTogglePlay: () => void;
  onPrevSentence: () => void;
  onNextSentence: () => void;
  onToggleLoopCurrent: () => void;
  onClose: () => void;
}

/**
 * 精听字幕全屏模式的键盘快捷键:
 * Space 播放/暂停 · ←/→ 上/下一句 · R 当前句循环 · Esc 关闭
 * 输入框/文本域聚焦时全部忽略。
 */
export function useTranscriptKeyboard(
  enabled: boolean,
  handlers: TranscriptKeyboardHandlers,
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          handlers.onTogglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handlers.onPrevSentence();
          break;
        case "ArrowRight":
          e.preventDefault();
          handlers.onNextSentence();
          break;
        case "r":
        case "R":
          handlers.onToggleLoopCurrent();
          break;
        case "Escape":
          handlers.onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handlers]);
}
