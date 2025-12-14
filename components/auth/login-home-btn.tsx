"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  CreditCardIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

export default function LoginHomeBtn() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 点击外部关闭下拉菜单逻辑
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  // 1. 未登录状态：显示登录按钮
  if (!session) {
    return (
      <button
        className="btn btn-primary btn-sm gap-2 shadow-sm shadow-primary/20"
        onClick={() => {
          const modal = document.getElementById(
            "email_check_modal_box",
          ) as HTMLDialogElement;
          if (modal) {
            modal.showModal();
          }
        }}
      >
        <UserCircleIcon className="w-5 h-5" />
        <span>登录</span>
      </button>
    );
  }

  // 2. 已登录状态：显示自定义 Avatar Dropdown
  const { user } = session;
  const displayName = user.nickname || user.email?.split("@")[0] || "User";
  const hasAvatar =
    user.avatarUrl &&
    user.avatarUrl !== "default_avatar_url" &&
    user.avatarUrl.startsWith("http");

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 p-1 pr-3 rounded-full hover:bg-base-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-base-100 border border-transparent hover:border-base-300"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* 头像区域 */}
        <div className="w-9 h-9 relative rounded-full overflow-hidden border border-base-300 bg-base-200 flex-shrink-0">
          {hasAvatar ? (
            <Image
              src={user.avatarUrl!}
              alt={displayName}
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-base-content/50">
              <UserIcon className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* 用户名 (仅在中等屏幕以上显示) */}
        <div className="hidden md:flex flex-col items-start text-sm max-w-[100px]">
          <span className="font-medium text-base-content truncate w-full text-left">
            {displayName}
          </span>
        </div>

        <ChevronDownIcon
          className={`w-4 h-4 text-base-content/60 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-base-100 rounded-xl shadow-xl border border-base-200 py-2 z-50 transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          {/* 头部信息 */}
          <div className="px-4 py-3 border-b border-base-200 mb-1">
            <p className="text-xs text-base-content/60">当前登录</p>
            <p
              className="text-sm font-semibold text-base-content truncate"
              title={user.email}
            >
              {user.email}
            </p>
          </div>

          {/* 菜单项 */}
          <div className="space-y-1 p-1">
            <Link
              href="/auth/personal-center"
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 hover:text-primary rounded-lg flex items-center space-x-3 transition-colors"
            >
              <UserCircleIcon className="w-5 h-5" />
              <span>个人中心</span>
            </Link>

            <Link
              href="/auth/personal-center" // 暂时指向个人中心
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 hover:text-primary rounded-lg flex items-center space-x-3 transition-colors"
            >
              <Cog6ToothIcon className="w-5 h-5" />
              <span>设置</span>
            </Link>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 hover:text-primary rounded-lg flex items-center space-x-3 transition-colors"
            >
              <CreditCardIcon className="w-5 h-5" />
              <span>我的订阅</span>
              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                Pro
              </span>
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 hover:text-primary rounded-lg flex items-center space-x-3 transition-colors"
            >
              <QuestionMarkCircleIcon className="w-5 h-5" />
              <span>帮助与支持</span>
            </button>
          </div>

          {/* 底部退出按钮 */}
          <div className="mt-2 pt-2 border-t border-base-200 px-2">
            <button
              onClick={async () => {
                setIsOpen(false);
                await signOut({ redirect: false });
                router.push("/browse");
              }}
              className="w-full text-left px-2 py-2 text-sm text-error hover:bg-error/10 rounded-lg flex items-center space-x-3 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span>退出登录</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
