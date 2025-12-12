"use client";
import LoginHomeBtn from "@/components/auth/login-home-btn";
import Player from "@/components/player/Player";
import PlayControls from "@/components/controls/PlayControls";
import SoundControls from "@/components/controls/SoundControls";
import { useState } from "react";
import Link from "next/link";
import { EqualsIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Menus from "@/components/main/menus";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import ThemeSwitcher from "@/components/theme-switcher";
import PhoneAcmeLogo from "@/components/phone-acme-logo";

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
          isMenuOpen ? "" : "shadow-xs"
        } z-50`}
      >
        <div className="flex items-center justify-between h-full px-4 relative z-50 bg-base-100">
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
              <PhoneAcmeLogo />
            </div>
          </Link>

          {/* 右侧主题切换按钮和登录按钮（仅移动端显示） */}
          <div className="ml-auto sm:hidden flex items-center space-x-2">
            <ThemeSwitcher />
            <LoginHomeBtn />
          </div>
        </div>

        {/* 可折叠菜单区域 - 修改为 absolute 定位以覆盖下层内容，并确保背景不透明 */}
        <div
          className={`absolute top-[48px] left-0 w-full bg-base-100 overflow-hidden transition-all duration-500 ease-in-out shadow-xl z-40`}
          style={{
            maxHeight: isMenuOpen ? `calc(100vh - 48px)` : "0px",
            opacity: isMenuOpen ? 1 : 0, // 增加透明度过渡优化视觉
          }}
        >
          <div className="h-[calc(100vh-48px)] overflow-y-auto bg-base-100">
            {/* 菜单内容 */}
            <div className="p-4 border-t border-base-200">
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
                  // 修改此处：使用 btn 类替代固定宽度的 div，确保包裹文字
                  <Link
                    href="/admin"
                    className="btn btn-xs btn-ghost font-normal whitespace-nowrap text-base-content"
                  >
                    控制台
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
