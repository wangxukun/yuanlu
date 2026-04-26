// components/main/sidenav.tsx
"use client";

import Link from "next/link";
import NavLinks from "@/components/main/nav-links";
import AcmeLogo from "@/components/acme-logo";
import { useSession } from "next-auth/react";
import NavLinksLogined from "@/components/main/nav-links-logined";
import { toast } from "sonner";

export default function SideNav() {
  const { data: session, status } = useSession();

  return (
    <aside className="py-8 px-6 w-72 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 z-50 overflow-hidden">
      <div className="flex flex-col grow">
        <div className="mb-12">
          <Link href="/">
            <AcmeLogo />
          </Link>
        </div>

        <nav className="flex flex-col gap-2 grow overflow-y-auto no-scrollbar">
          <NavLinks />

          {status === "authenticated" && session && (
            <div className="flex flex-col gap-2 mt-4">
              <span
                className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                我的学习
              </span>
              <NavLinksLogined />
            </div>
          )}
        </nav>
      </div>

      {status === "authenticated" && session && (
        <div className="mt-auto pt-8">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[2rem]">
            <p
              className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-2"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              远路会员
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              探索无限精彩，开启深度旅程。
            </p>
            <button
              onClick={() =>
                toast.success("目前您已经拥有访问该网站所有功能权限")
              }
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="block w-full bg-indigo-600 text-white py-2 px-4 rounded-[2rem] font-bold text-xs text-center hover:bg-indigo-700 transition-colors"
            >
              立即升级
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
