"use client";
import LoginHomeBtn from "@/components/auth/login-home-btn";
import Player from "@/components/player/Player";
import PlayControls from "@/components/controls/PlayControls";
import SoundControls from "@/components/controls/SoundControls";
import { useState } from "react";
import Link from "next/link";
import AcmeLogo from "@/components/acme-logo";
import { EqualsIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Menus from "@/components/main/menus";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import ThemeSwitcher from "@/components/theme-switcher";

export default function Header() {
  const { data: session, status } = useSession();
  // 移动端菜单开关状态
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // 菜单开关状态切换
  const closeMenu = () => setIsMenuOpen(false);
  return (
    <div>
      {/* 移动端浏览器下Header */}
      <div
        className={`sm:hidden fixed w-full top-0 h-[48px] bg-base-100 transition-shadow duration-500 ${
          isMenuOpen ? "" : "shadow-xs" // 动态控制阴影
        } z-50`}
      >
        <div className="flex items-center justify-between h-full px-4">
          {/* 左侧菜单切换按钮 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg bg-base-200 hover:bg-base-300"
          >
            {isMenuOpen ? (
              <XMarkIcon className="w-7 h-7 text-base-content" />
            ) : (
              <EqualsIcon className="w-7 h-7 text-base-content" />
            )}
          </button>

          {/* 中间 Logo */}
          <Link href="/" className="flex-1 flex justify-center">
            <div className="w-32 text-base-content">
              <AcmeLogo />
            </div>
          </Link>

          {/* 右侧主题切换按钮和登录按钮（仅移动端显示） */}
          <div className="ml-auto sm:hidden flex items-center space-x-2">
            <ThemeSwitcher />
            <LoginHomeBtn />
          </div>
        </div>

        {/* 可折叠菜单区域 */}
        <div
          className="overflow-hidden transition-all duration-500 ease-in-out"
          style={{
            maxHeight: isMenuOpen
              ? `calc(100vh - 48px)` // 视口高度减去Header高度
              : "0px",
            transitionProperty: "max-height",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div className="bg-base-100 h-[calc(100vh-48px)]">
            {/* 菜单内容 */}
            <div className="p-4 border-t border-base-200">
              {/* 这里放置菜单项*/}
              <Menus onLinkClick={closeMenu} />
            </div>
          </div>
        </div>
      </div>
      {/* 桌面浏览器下Header */}
      <div className="hidden sm:block fixed h-[58px] top-0 lg:left-[260px] lg:w-[calc(100%-260px)] shadow-xs border-b border-base-300 bg-base-100 z-50">
        <div className="flex items-center justify-between h-full w-full">
          {/* 左侧播放、回退、前进按钮 */}
          <div className="flex-[30%] min-w-0 flex items-center">
            <div className="flex items-center mx-auto my-auto">
              <PlayControls />
            </div>
          </div>

          {/* 中间 */}
          <div className="flex-[40%] min-w-0 flex justify-center">
            <Player />
          </div>

          {/* 右侧按钮组 */}
          <div className="flex-[30%] min-w-0 flex items-center justify-between p-4">
            <div className="flex items-center">
              <SoundControls />
            </div>
            <div className="flex items-center space-x-4">
              <ThemeSwitcher />
              {status === "authenticated" &&
                (session as Session).user.role === "ADMIN" && (
                  <Link href="/dashboard" className="flex-1 flex">
                    <div className="w-20 text-xs text-base-content bg-base-200 hover:bg-base-300 px-2 py-1 rounded-lg transition-colors">
                      控制台
                    </div>
                  </Link>
                )}
              {/* 登录按钮 */}
              <LoginHomeBtn />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
