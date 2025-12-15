"use client";
import LoginHomeBtn from "@/components/auth/login-home-btn";
import Player from "@/components/player/Player";
import PlayControls from "@/components/controls/PlayControls";
import SoundControls from "@/components/controls/SoundControls";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Menus from "@/components/main/menus";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import ThemeSwitcher from "@/components/theme-switcher";
import PhoneAcmeLogo from "@/components/phone-acme-logo";

export default function Header() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {/* ================= 移动端/平板端 Header (< lg) ================= */}
      <div
        // [修改] 移除 /90 透明度和 backdrop-blur，改为纯色 bg-base-100
        className={`lg:hidden fixed w-full top-0 h-[60px] z-50 transition-all duration-300 ${
          scrolled || isMenuOpen
            ? "bg-base-100 shadow-sm border-b border-base-200"
            : "bg-base-100 border-b border-transparent"
        }`}
      >
        <div className="flex items-center justify-between h-full px-4 relative z-50">
          {/* 左侧：菜单按钮 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 -ml-2 rounded-full hover:bg-base-200 transition-colors active:scale-95"
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? (
              <XMarkIcon className="w-6 h-6 text-base-content" />
            ) : (
              <Bars3Icon className="w-6 h-6 text-base-content" />
            )}
          </button>

          {/* 中间：Logo */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2"
            onClick={closeMenu}
          >
            <div className="w-24 opacity-90 hover:opacity-100 transition-opacity flex justify-center">
              <PhoneAcmeLogo />
            </div>
          </Link>

          {/* 右侧：工具栏 */}
          <div className="flex items-center space-x-1 z-20">
            <ThemeSwitcher />
            <div className="scale-90 origin-right">
              <LoginHomeBtn />
            </div>
          </div>
        </div>

        {/* 折叠菜单 */}
        <div
          // [修改] 移除 bg-base-100/95 和 backdrop-blur-xl，确保背景完全不透明
          // 添加 h-screen 确保遮住底部内容 (视情况而定，calc 计算更精准)
          className={`absolute top-[60px] left-0 w-full bg-base-100 border-b border-base-200 overflow-hidden transition-all duration-300 ease-in-out shadow-xl z-40`}
          style={{
            // 使用 calc(100vh - 60px) 确保菜单占满剩余屏幕高度，遮挡住下面的内容
            height: isMenuOpen ? "calc(100vh - 60px)" : "0px",
            opacity: isMenuOpen ? 1 : 0,
          }}
        >
          <div className="h-full overflow-y-auto pb-8">
            <Menus onLinkClick={closeMenu} />
          </div>
        </div>
      </div>

      {/* ================= 桌面端 Header (>= lg) ================= */}
      <div
        className={`hidden lg:flex fixed top-0 left-[260px] w-[calc(100%-260px)] h-[72px] z-40 transition-all duration-300 items-center justify-between px-6 border-b border-base-200 ${
          scrolled ? "bg-base-100/80 backdrop-blur-lg shadow-sm" : "bg-base-100"
        }`}
      >
        {/* 左区域：播放控制 */}
        <div className="flex-none w-[180px] flex items-center justify-start">
          <PlayControls />
        </div>

        {/* 中间区域：进度条与信息 */}
        <div className="flex-1 max-w-3xl px-4 flex justify-center">
          <Player />
        </div>

        {/* 右区域：音量与设置 */}
        <div className="flex-none w-[300px] flex items-center justify-end gap-4">
          <div className="hidden xl:block">
            <SoundControls />
          </div>

          <div className="h-6 w-px bg-base-300 mx-2"></div>

          <div className="flex items-center gap-2">
            <ThemeSwitcher />

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
