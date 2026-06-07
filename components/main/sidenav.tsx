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
    </aside>
  );
}
