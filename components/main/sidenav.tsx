"use client";

import Link from "next/link";
import NavLinks from "@/components/main/nav-links";
import AcmeLogo from "@/components/acme-logo";
import { useSession } from "next-auth/react";
import NavLinksLogined from "@/components/main/nav-links-logined";

export default function SideNav() {
  const { data: session, status } = useSession();

  return (
    // [修改] hidden sm:block -> hidden lg:block
    // 只有在 Large (1024px+) 屏幕上才显示侧边栏
    <aside className="hidden lg:block w-[260px] border-r border-base-300 h-screen flex flex-col justify-between bg-base-100 fixed left-0 top-0 overflow-y-auto z-50">
      <Link
        className="mb-2 flex h-24 flex-col items-center justify-center gap-2 p-4"
        href="/"
      >
        <div className="w-full text-base-content flex justify-center">
          <AcmeLogo />
        </div>
      </Link>

      <div className="flex grow flex-col px-2 space-y-2">
        <NavLinks />

        {status === "authenticated" && session && (
          <div className="flex flex-col space-y-2 pt-6 mt-4 border-t border-base-200">
            <span className="px-4 text-xs font-bold text-base-content/50 uppercase tracking-wider">
              我的学习
            </span>
            <NavLinksLogined />
          </div>
        )}
      </div>

      <div className="p-4"></div>
    </aside>
  );
}
