import clsx from "clsx";

/**
 * PRO 专属徽章（唯一合法实现）
 * 设计规范：曙光橙描边小胶囊，不使用渐变。
 */
export default function ProBadge({
  size = "sm",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border font-extrabold tracking-widest",
        "border-accent-300 bg-accent-100/95 text-accent-700",
        "dark:border-accent-700 dark:bg-accent-900/70 dark:text-accent-300",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      PRO
    </span>
  );
}
