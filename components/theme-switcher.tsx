"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeSwitcher({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // 只在客户端渲染时执行
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className={
        className ||
        "w-10 h-10 flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800 rounded-full transition-colors text-ink-400"
      }
      aria-label="切换主题"
    >
      <span className="material-symbols-outlined">
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
      {children}
    </button>
  );
}
