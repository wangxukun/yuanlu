"use client";

import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bookmark,
  ChevronRight,
  CircleHelp,
  CircleUser,
  CreditCard,
  History,
  LayoutDashboard,
  Mic,
  Palette,
  Route,
  TextQuote,
  User,
} from "lucide-react";
import ThemeSwitcher from "@/components/theme-switcher";
import { useNotificationStore } from "@/store/notification-store";

export default function MinePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

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

  return (
    <div className="min-h-[calc(100vh-var(--mobile-bottom-total))] bg-base-200 text-base-content pb-24 px-4 pt-6">
      {/* 头部：用户信息区 */}
      <div className="bg-base-100 rounded-3xl p-6 shadow-sm mb-6 flex items-center justify-between">
        {!session ? (
          <div
            className="flex items-center gap-4 w-full cursor-pointer"
            onClick={() => {
              const modal = document.getElementById(
                "email_check_modal_box",
              ) as HTMLDialogElement;
              if (modal) modal.showModal();
            }}
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
            <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
          </div>
        ) : (
          <div className="flex items-center gap-4 w-full">
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
                  <CircleUser className="w-10 h-10" strokeWidth={1.5} aria-hidden />
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
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
          </div>
        )}
      </div>

      {/* 学习与记录 (登录可见) */}
      {session && (
        <div className="bg-base-100 rounded-3xl overflow-hidden shadow-sm mb-6">
          <Link
            href="/library/sentences"
            className="flex items-center px-5 py-4 hover:bg-base-200 active:bg-base-200 transition-colors border-b border-base-200/50"
          >
            <TextQuote className="w-5 h-5 text-warning mr-4" strokeWidth={1.75} aria-hidden />
            <span className="flex-1 font-semibold">句子本</span>
            <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
          </Link>
          <Link
            href="/library/pronunciation"
            className="flex items-center px-5 py-4 hover:bg-base-200 active:bg-base-200 transition-colors border-b border-base-200/50"
          >
            <Mic className="w-5 h-5 text-info-500 mr-4" strokeWidth={1.75} aria-hidden />
            <span className="flex-1 font-semibold">发音弱项本</span>
            <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
          </Link>
          <Link
            href="/library/learning-paths"
            className="flex items-center px-5 py-4 hover:bg-base-200 active:bg-base-200 transition-colors border-b border-base-200/50"
          >
            <Route className="w-5 h-5 text-primary-500 mr-4" strokeWidth={1.75} aria-hidden />
            <span className="flex-1 font-semibold">学习路径</span>
            <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
          </Link>
          <Link
            href="/library/history"
            className="flex items-center px-5 py-4 hover:bg-base-200 active:bg-base-200 transition-colors border-b border-base-200/50"
          >
            <History className="w-5 h-5 text-secondary-500 mr-4" strokeWidth={1.75} aria-hidden />
            <span className="flex-1 font-semibold">收听历史</span>
            <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
          </Link>
          <Link
            href="/library/favorites"
            className="flex items-center px-5 py-4 hover:bg-base-200 active:bg-base-200 transition-colors"
          >
            <Bookmark className="w-5 h-5 text-accent-500 mr-4" strokeWidth={1.75} aria-hidden />
            <span className="flex-1 font-semibold">我的收藏</span>
            <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      )}

      {/* 账户与系统设置 */}
      <div className="bg-base-100 rounded-3xl overflow-hidden shadow-sm mb-6">
        {session && (
          <>
            <Link
              href="/auth/personal-center"
              className="flex items-center px-5 py-4 hover:bg-base-200 active:bg-base-200 transition-colors border-b border-base-200/50"
            >
              <User className="w-5 h-5 text-base-content/60 mr-4" strokeWidth={1.75} aria-hidden />
              <span className="flex-1 font-semibold">个人中心</span>
              <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
            </Link>
            <Link
              href="/auth/subscribe"
              className="flex items-center px-5 py-4 hover:bg-base-200 active:bg-base-200 transition-colors border-b border-base-200/50"
            >
              <CreditCard className="w-5 h-5 text-base-content/60 mr-4" strokeWidth={1.75} aria-hidden />
              <span className="flex-1 font-semibold">我的订阅</span>
              <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
            </Link>
          </>
        )}

        {session?.user?.role === "ADMIN" && (
          <Link
            href="/admin"
            className="flex items-center px-5 py-4 hover:bg-base-200 active:bg-base-200 transition-colors border-b border-base-200/50"
          >
            <LayoutDashboard className="w-5 h-5 text-error-500 dark:text-error-400 mr-4" strokeWidth={1.75} aria-hidden />
            <span className="flex-1 font-semibold text-error-500 dark:text-error-400">控制台</span>
            <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
          </Link>
        )}

        <ThemeSwitcher
          className="w-full flex items-center px-5 py-4 hover:bg-base-200 active:bg-base-200 transition-colors border-b border-base-200/50 text-base-content"
          icon={
            <Palette
              className="w-5 h-5 text-base-content/60 mr-4"
              strokeWidth={1.75}
              aria-hidden
            />
          }
        >
          <span className="ml-4 flex-1 text-left font-semibold">外观设置</span>
          <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
        </ThemeSwitcher>

        {session && (
          <Link
            href="/notifications"
            className="flex items-center px-5 py-4 hover:bg-base-200 active:bg-base-200 transition-colors border-b border-base-200/50"
          >
            <div className="relative mr-4 w-6 h-6">
              <Bell className="w-5 h-5 text-base-content/60" strokeWidth={1.75} aria-hidden />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-error-500 ring-2 ring-base-100 z-10"></span>
              )}
            </div>
            <span className="flex-1 font-semibold">消息通知</span>
            {unreadCount > 0 && (
              <span className="mr-3 px-2 py-0.5 bg-error-500/10 dark:bg-error-400/10 text-error-500 dark:text-error-400 rounded-full text-xs font-bold">
                {unreadCount} 条新通知
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
          </Link>
        )}

        <Link
          href="/contact"
          className="flex items-center px-5 py-4 hover:bg-base-200 active:bg-base-200 transition-colors"
        >
          <CircleHelp className="w-5 h-5 text-base-content/60 mr-4" strokeWidth={1.75} aria-hidden />
          <span className="flex-1 font-semibold">帮助与支持</span>
          <ChevronRight className="w-5 h-5 text-base-content/30" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>

      {/* 退出登录 */}
      {session && (
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            router.push("/home");
          }}
          className="w-full bg-base-100 text-error-500 dark:text-error-400 font-bold text-lg py-4 rounded-3xl shadow-sm hover:bg-error-500/10 dark:hover:bg-error-400/10 active:scale-[0.98] transition-all"
        >
          退出登录
        </button>
      )}
    </div>
  );
}
