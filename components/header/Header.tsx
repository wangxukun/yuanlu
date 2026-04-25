// components/header/Header.tsx
"use client";
import LoginHomeBtn from "@/components/auth/login-home-btn";

import React from "react";
import { useSession } from "next-auth/react";
import ThemeSwitcher from "@/components/theme-switcher";
import NotificationBell from "@/components/header/NotificationBell";

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
        <h1
          className="text-xl font-black text-indigo-600 dark:text-indigo-400"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          The Voyager
        </h1>
      </div>

      <div className="flex-1 flex justify-end items-center gap-6">
        <div className="relative w-96 hidden md:block">
          <input
            className="w-full h-12 bg-slate-100 dark:bg-slate-800 border-none rounded-full px-6 pl-12 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-shadow outline-none text-slate-700 dark:text-slate-200"
            placeholder="搜索路径、声音、智慧..."
            type="text"
            style={{ fontFamily: "'Inter', sans-serif" }}
          />
          <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400">
            search
          </span>
        </div>

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
