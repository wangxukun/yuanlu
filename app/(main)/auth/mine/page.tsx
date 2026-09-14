"use client";

import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  ChevronRight,
  CircleHelp,
  CircleUser,
  CreditCard,
  History,
  LayoutDashboard,
  Palette,
  Route,
} from "lucide-react";
import ThemeSwitcher from "@/components/theme-switcher";

/** 高频学习数据入口：图标 + 目标路由（纯彩色图标，瓦片无背景色） */
const GRID_ENTRIES = [
  {
    name: "学习路径",
    href: "/library/learning-paths",
    icon: Route,
    iconClass: "text-primary-600 dark:text-primary-400",
  },
  {
    name: "收听历史",
    href: "/library/history",
    icon: History,
    iconClass: "text-secondary-500",
  },
  {
    name: "我的收藏",
    href: "/library/favorites",
    icon: Bookmark,
    iconClass: "text-accent-500",
  },
  {
    name: "我的订阅",
    href: "/auth/subscribe",
    icon: CreditCard,
    iconClass: "text-warning",
  },
];

export default function MinePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 避免在客户端渲染前闪烁
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || status === "loading") {
    return (
      <div className="min-h-[calc(100vh-var(--mobile-bottom-total))] bg-base-200 animate-pulse flex items-center justify-center">
        <span className="loading loading-spinner text-primary-600 dark:text-primary-400"></span>
      </div>
    );
  }

  const user = session?.user;
  const displayName = user?.nickname || user?.email?.split("@")[0] || "User";
  const hasAvatar =
    user?.avatarUrl &&
    user?.avatarUrl !== "default_avatar_url" &&
    user?.avatarUrl.startsWith("http");

  const openLoginModal = () => {
    const modal = document.getElementById(
      "email_check_modal_box",
    ) as HTMLDialogElement;
    if (modal) modal.showModal();
  };

  return (
    <div className="min-h-[calc(100vh-var(--mobile-bottom-total))] bg-base-200 text-base-content pb-24 px-4 pt-6">
      {/* 头部身份区：点击进入个人中心编辑页；未登录点击拉起登录。
          按压态放在圆角卡片容器上（:active 会沿祖先链传播），
          避免在 Link 内部出现不随圆角的方形色块 */}
      <div className="bg-base-100 rounded-3xl p-6 shadow-sm mb-6 active:bg-base-200/60 active:scale-[0.99] transition-all duration-200 ease-in-out">
        {!session ? (
          <div
            className="flex items-center gap-4 w-full cursor-pointer"
            onClick={openLoginModal}
          >
            <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center flex-shrink-0 text-base-content/30">
              <CircleUser className="w-10 h-10" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">未登录</h2>
              <p className="text-sm text-base-content/50 mt-1">
                点击登录或注册，开启学习之旅
              </p>
            </div>
            <ChevronRight
              className="w-5 h-5 text-base-content/30"
              strokeWidth={1.75}
              aria-hidden
            />
          </div>
        ) : (
          <Link
            href="/auth/personal-center"
            className="flex items-center gap-4 w-full"
          >
            <div className="w-16 h-16 relative rounded-full overflow-hidden border border-base-300 bg-base-200 flex-shrink-0">
              {hasAvatar ? (
                <Image
                  src={user?.avatarUrl || ""}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-base-content/50">
                  <CircleUser
                    className="w-10 h-10"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <h2 className="text-xl font-bold truncate">{displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                {user?.role === "ADMIN" ? (
                  <span className="text-xs text-primary-600 dark:text-primary-400 font-bold bg-primary-600/10 dark:bg-primary-400/10 px-2 py-0.5 rounded-md">
                    管理员
                  </span>
                ) : user?.role === "PREMIUM" ? (
                  <span className="text-xs text-accent-500 font-bold bg-accent-500/10 px-2 py-0.5 rounded-md">
                    高级会员
                  </span>
                ) : (
                  <span className="text-xs text-base-content/50 bg-base-200 px-2 py-0.5 rounded-md">
                    普通用户
                  </span>
                )}
              </div>
              <p className="text-xs text-base-content/50 mt-1 truncate">
                {user?.email}
              </p>
            </div>
            <ChevronRight
              className="w-5 h-5 text-base-content/30 flex-shrink-0"
              strokeWidth={1.75}
              aria-hidden
            />
          </Link>
        )}
      </div>

      {/* 数据轨迹宫格：高频学习数据入口（登录可见） */}
      {session && (
        <div className="bg-base-100 rounded-3xl shadow-sm mb-6">
          <div className="grid grid-cols-4">
            {GRID_ENTRIES.map(({ name, href, icon: Icon, iconClass }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl bg-base-100 md:hover:bg-base-200/60 active:scale-95 active:bg-base-300 transition-all duration-200 ease-in-out"
              >
                <span
                  className={`flex items-center justify-center w-11 h-11 rounded-2xl ${iconClass}`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="text-xs font-semibold text-base-content/70">
                  {name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 系统管理列表：低频管理操作 */}
      <div className="bg-base-100 rounded-3xl overflow-hidden shadow-sm mb-6">
        {session?.user?.role === "ADMIN" && (
          <Link
            href="/admin"
            className="flex items-center px-5 py-4 md:hover:bg-base-200 active:bg-base-300 active:scale-[0.98] transition-all duration-200 ease-in-out border-b border-base-200/50"
          >
            <LayoutDashboard
              className="w-5 h-5 text-error-500 dark:text-error-400 mr-4"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="flex-1 font-semibold text-error-500 dark:text-error-400">
              控制台
            </span>
            <ChevronRight
              className="w-5 h-5 text-base-content/30"
              strokeWidth={1.75}
              aria-hidden
            />
          </Link>
        )}

        {/* 外观设置：原地切换主题（不导航）。移动端必须禁用 hover 反馈——
            触屏 tap 会触发 :hover 且点击后粘住不释放，主题切回浅色后
            该行会残留 hover:bg-base-200 的灰底（md: 断点以上才启用悬停效果） */}
        <ThemeSwitcher
          className="w-full flex items-center px-5 py-4 md:hover:bg-base-200 active:bg-base-300 active:scale-[0.98] transition-all duration-200 ease-in-out border-b border-base-200/50 text-base-content"
          icon={
            <Palette
              className="w-5 h-5 text-base-content/60 mr-4"
              strokeWidth={1.75}
              aria-hidden
            />
          }
        >
          <span className="flex-1 text-left font-semibold">外观设置</span>
          <ChevronRight
            className="w-5 h-5 text-base-content/30"
            strokeWidth={1.75}
            aria-hidden
          />
        </ThemeSwitcher>

        <Link
          href="/contact"
          className="flex items-center px-5 py-4 md:hover:bg-base-200 active:bg-base-300 active:scale-[0.98] transition-all duration-200 ease-in-out"
        >
          <CircleHelp
            className="w-5 h-5 text-base-content/60 mr-4"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="flex-1 font-semibold">帮助与支持</span>
          <ChevronRight
            className="w-5 h-5 text-base-content/30"
            strokeWidth={1.75}
            aria-hidden
          />
        </Link>
      </div>

      {/* 退出登录 */}
      {session && (
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            router.push("/home");
          }}
          className="w-full bg-base-100 text-error-500 dark:text-error-400 font-bold text-lg py-4 rounded-3xl shadow-sm md:hover:bg-error-500/10 dark:md:hover:bg-error-400/10 active:scale-[0.98] active:bg-error-500/15 dark:active:bg-error-400/15 transition-all duration-200 ease-in-out"
        >
          退出登录
        </button>
      )}
    </div>
  );
}
