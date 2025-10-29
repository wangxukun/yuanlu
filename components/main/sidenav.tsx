"use client";

import Link from "next/link";
import NavLinks from "@/components/main/nav-links";
import AcmeLogo from "@/components/acme-logo";
import { useSession } from "next-auth/react"; // 客户端组件获取会话
import NavLinksLogined from "@/components/main/nav-links-logined";

export default function SideNav() {
  const { data: session, status } = useSession();

  return (
    <aside className="hidden sm:block w-[260px] border-r border-base-300 h-screen flex flex-col justify-between">
      <Link
        className="mb-2 flex h-32 flex-col items-center justify-center gap-5 rounded-md p-4 md:h-40"
        href="/"
      >
        <div className="w-32 text-base-content md:w-48">
          <AcmeLogo />
        </div>
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks />
        {status === "authenticated" && session && (
          <div className="flex flex-col space-y-2 pt-5">
            <span className="hidden pl-7 text-xs md:block text-base-content">
              {session.user?.email ? session.user.email.split("@")[0] : "用户"}
              的资料库
            </span>
            <NavLinksLogined />
          </div>
        )}
        <div className="hidden h-auto w-full grow rounded-md bg-base-200 md:block"></div>
      </div>
    </aside>
  );
}
