// components/header/Header.tsx
"use client";
import LoginHomeBtn from "@/components/auth/login-home-btn";

import React from "react";
import { useSession } from "next-auth/react";
import ThemeSwitcher from "@/components/theme-switcher";
import NotificationBell from "@/components/header/NotificationBell";
import SearchBar from "@/components/header/SearchBar";
import Image from "next/image";

export default function Header() {
  const { status } = useSession();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 lg:px-8 w-full h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 ease-in-out border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-4 lg:hidden">
        <label
          htmlFor="main-drawer"
          className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 cursor-pointer"
          aria-label="Toggle Menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </label>
        <div className="flex items-center">
          <Image
            src="/static/images/apple-touch-icon-light.png"
            alt="远路播客 Logo"
            width={32}
            height={32}
            className="h-8 w-8 object-contain dark:hidden"
          />
          <Image
            src="/static/images/apple-touch-icon-dark.png"
            alt="远路播客 Logo"
            width={32}
            height={32}
            className="h-8 w-8 object-contain hidden dark:block"
          />
        </div>
      </div>

      <div className="flex-1 flex justify-end items-center gap-6">
        <SearchBar />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {status === "authenticated" && <NotificationBell />}
            <ThemeSwitcher />
            <LoginHomeBtn />
          </div>
        </div>
      </div>
    </header>
  );
}
