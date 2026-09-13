"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeSwitcher({
  className,
  children,
  icon,
}: {
  className?: string;
  children?: React.ReactNode;
  /** 自定义前导图标（如菜单行使用 Palette），缺省为日/月切换图标 */
  icon?: React.ReactNode;
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
      {icon ??
        (theme === "dark" ? (
          <Sun className="w-5 h-5" strokeWidth={1.75} aria-hidden />
        ) : (
          <Moon className="w-5 h-5" strokeWidth={1.75} aria-hidden />
        ))}
      {children}
    </button>
  );
}
