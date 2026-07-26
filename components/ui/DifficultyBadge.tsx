import clsx from "clsx";
import { difficultyTextColor } from "@/lib/difficulty";

/**
 * 难度徽章（封面右上角白底彩字形式）
 * 配色逻辑见 lib/difficulty.ts
 */
export default function DifficultyBadge({
  level,
  className,
}: {
  level?: string | null;
  className?: string;
}) {
  if (!level) return null;
  return (
    <span
      className={clsx(
        "rounded bg-white/95 px-2 py-0.5 text-sm font-extrabold tracking-wide shadow-sm dark:bg-ink-900/95",
        difficultyTextColor(level),
        className,
      )}
    >
      {level}
    </span>
  );
}
