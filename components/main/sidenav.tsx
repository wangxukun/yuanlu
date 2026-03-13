// components/main/sidenav.tsx
"use client";

import Link from "next/link";
import NavLinks from "@/components/main/nav-links";
import AcmeLogo from "@/components/acme-logo";
import { useSession } from "next-auth/react";
import NavLinksLogined from "@/components/main/nav-links-logined";

export default function SideNav() {
  const { data: session, status } = useSession();

  return (
    // 移除 fixed 和 hidden lg:flex，因为 drawer-side 已经处理了这些
    <aside className="w-[var(--sidebar-width)] min-h-full bg-base-100 border-r border-base-300 flex flex-col justify-between overflow-y-auto">
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
