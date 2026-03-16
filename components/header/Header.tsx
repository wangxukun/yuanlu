// components/header/Header.tsx
"use client";
import LoginHomeBtn from "@/components/auth/login-home-btn";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import ThemeSwitcher from "@/components/theme-switcher";
import PhoneAcmeLogo from "@/components/phone-acme-logo";
import NotificationBell from "@/components/header/NotificationBell";

export default function Header() {
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* ================= 移动端/平板端 Header (< lg) ================= */}
      <div
        className={`lg:hidden fixed w-full top-0 h-[var(--header-height-mobile)] z-50 transition-all duration-300 ${
          scrolled
            ? "bg-base-100 shadow-sm border-b border-base-200"
            : "bg-base-100 border-b border-transparent"
        }`}
      >
        <div className="flex items-center justify-between h-full px-4 relative z-50">
          {/* 左侧：菜单按钮 (改为 label 触发 drawer) */}
          <label
            htmlFor="main-drawer"
            className="p-2 -ml-2 rounded-full hover:bg-base-200 transition-colors active:scale-95 shrink-0 lg:hidden cursor-pointer"
            aria-label="Toggle Menu"
          >
            <Bars3Icon className="w-6 h-6 text-base-content" />
          </label>

          {/* 中间：Logo */}
          <Link
            href="/"
            className="flex-1 flex justify-center sm:absolute sm:left-1/2 sm:-translate-x-1/2"
          >
            <div className="opacity-90 hover:opacity-100 transition-opacity flex justify-center">
              <PhoneAcmeLogo />
            </div>
          </Link>

          {/* 右侧：工具栏 */}
          <div className="flex items-center space-x-1 z-20 shrink-0">
            <ThemeSwitcher />
            {status === "authenticated" && <NotificationBell />}
            <div className="scale-90 origin-right">
              <LoginHomeBtn />
            </div>
          </div>
        </div>
      </div>

      {/* ================= 桌面端 Header (>= lg) ================= */}
      <div
        className={`hidden lg:flex fixed top-0 left-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))] h-[var(--header-height-desktop)] z-40 transition-all duration-300 items-center justify-between px-6 border-b border-base-200 ${
          scrolled ? "bg-base-100/80 backdrop-blur-lg shadow-sm" : "bg-base-100"
        }`}
      >
        {/* 中间区域（由于移除了之前的播放器相关组件，这里可根据需要留白或作为其他用途，目前保留为空） */}
        <div className="flex-1 max-w-3xl px-4 flex justify-center"></div>

        {/* 右区域：设置等 */}
        <div className="flex-none w-[300px] flex items-center justify-end gap-4">
          <div className="h-6 w-px bg-base-300 mx-2"></div>

          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            {status === "authenticated" && <NotificationBell />}

            {status === "authenticated" &&
              (session as Session).user.role === "ADMIN" && (
                <Link href="/admin">
                  <button className="btn btn-xs btn-ghost whitespace-nowrap">
                    控制台
                  </button>
                </Link>
              )}
            <LoginHomeBtn />
          </div>
        </div>
      </div>
    </>
  );
}
