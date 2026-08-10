"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PracticeSettingsPanel from "./PracticeSettingsPanel";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * 触发按钮的共享样式（Material Symbols `settings` 齿轮图标）。
 */
function TriggerButton({
  isOpen,
  onClick,
  className,
}: {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-xl transition-colors",
        isOpen
          ? "bg-ink-100 dark:bg-ink-800 text-primary-600 dark:text-primary-400"
          : "text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-ink-100 dark:hover:bg-ink-800",
        className,
      )}
      title="设置"
      aria-label="语音评测设置"
    >
      <span className="material-symbols-outlined text-xl">settings</span>
    </button>
  );
}

/**
 * 语音评测设置入口。
 * - variant="drawer"：桌面端，点击从右侧滑入侧边抽屉（z-[210]，高于沉浸层 z-[200]）。
 * - variant="mobile"：移动端，下拉面板（复用 FCT 样式），点击外部关闭。
 */
export default function PracticeSettingsButton({
  variant,
}: {
  variant: "drawer" | "mobile";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭（移动端下拉用；桌面 Drawer 有自带的关闭按钮 + 遮罩）
  useEffect(() => {
    if (variant !== "mobile") return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [variant]);

  // Esc 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (variant === "drawer") {
    return (
      <>
        <TriggerButton isOpen={isOpen} onClick={() => setIsOpen((v) => !v)} />
        <AnimatePresence>
          {isOpen && (
            <>
              {/* 遮罩 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[210] bg-black/30 backdrop-blur-sm"
              />
              {/* 抽屉 */}
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
                className="fixed right-0 top-0 h-full w-[340px] max-w-[88vw] z-[210] bg-white dark:bg-ink-900 shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-ink-100 dark:border-ink-800">
                  <h3 className="text-sm font-bold text-ink-800 dark:text-ink-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-primary-500">
                      settings
                    </span>
                    语音评测设置
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-ink-400 hover:text-primary-600 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                    title="关闭"
                  >
                    <span className="material-symbols-outlined text-xl">
                      close
                    </span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
                  <PracticeSettingsPanel />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // mobile 下拉
  return (
    <div className="relative" ref={containerRef}>
      <TriggerButton isOpen={isOpen} onClick={() => setIsOpen((v) => !v)} />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 max-h-[70vh] overflow-y-auto scrollbar-thin rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 shadow-e3 p-1.5 z-50"
          >
            <PracticeSettingsPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
