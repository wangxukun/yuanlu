"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function ThemeSwitcher() {
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
      className="flex items-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors"
      aria-label="切换主题"
    >
      {theme === "dark" ? (
        <>
          <SunIcon className="w-5 h-5 text-yellow-400" />
          {/*<span className="text-secondary-foreground dark:text-muted-foreground">浅色</span>*/}
        </>
      ) : (
        <>
          <MoonIcon className="w-5 h-5 text-indigo-800" />
          {/*<span className="text-secondary-foreground dark:text-muted-foreground">深色</span>*/}
        </>
      )}
    </button>
  );
}
