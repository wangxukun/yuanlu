// components/header/Header.tsx
"use client";
import LoginHomeBtn from "@/components/auth/login-home-btn";

import React from "react";
import { useSession } from "next-auth/react";
import ThemeSwitcher from "@/components/theme-switcher";
import NotificationBell from "@/components/header/NotificationBell";
import SearchBar from "@/components/header/SearchBar";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const { status } = useSession();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 lg:px-8 w-full h-14 md:h-20 bg-white/80 dark:bg-ink-900/80 backdrop-blur-xl transition-all duration-300 ease-in-out border-b border-ink-100 dark:border-ink-800">
      <div className="flex items-center gap-4 xl:hidden">
        <label
          htmlFor="main-drawer"
          className="w-10 h-10 flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800 rounded-full transition-colors text-ink-500 cursor-pointer"
          aria-label="Toggle Menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </label>
        <Link href="/" className="flex items-center">
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
        </Link>
      </div>

      <div className="flex-1 flex justify-end items-center gap-6">
        <div className="hidden md:block">
          <SearchBar />
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
