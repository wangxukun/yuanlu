// components/main/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  Squares2X2Icon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  Squares2X2Icon as SquaresSolid,
  BookOpenIcon as BookSolid,
} from "@heroicons/react/24/solid";
import { useSession } from "next-auth/react";
import clsx from "clsx";

export default function BottomNav() {
  const pathname = usePathname();
  const { status } = useSession();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] bg-base-100/95 backdrop-blur-lg border-t border-base-200 flex items-center justify-around px-2 z-50 pb-safe">
      <Link
        href="/home"
        className={clsx(
          "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors active:scale-95",
          pathname === "/home"
            ? "text-primary"
            : "text-base-content/60 hover:text-base-content",
        )}
      >
        {pathname === "/home" ? (
          <HomeSolid className="w-6 h-6" />
        ) : (
          <HomeIcon className="w-6 h-6" />
        )}
        <span className="text-[10px] font-medium">主页</span>
      </Link>
      <Link
        href="/discover"
        className={clsx(
          "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors active:scale-95",
          pathname === "/discover"
            ? "text-primary"
            : "text-base-content/60 hover:text-base-content",
        )}
      >
        {pathname === "/discover" ? (
          <SquaresSolid className="w-6 h-6" />
        ) : (
          <Squares2X2Icon className="w-6 h-6" />
        )}
        <span className="text-[10px] font-medium">发现</span>
      </Link>
      {status === "authenticated" && (
        <Link
          href="/library/learning-paths"
          className={clsx(
            "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors active:scale-95",
            pathname.startsWith("/library")
              ? "text-primary"
              : "text-base-content/60 hover:text-base-content",
          )}
        >
          {pathname.startsWith("/library") ? (
            <BookSolid className="w-6 h-6" />
          ) : (
            <BookOpenIcon className="w-6 h-6" />
          )}
          <span className="text-[10px] font-medium">学习</span>
        </Link>
      )}
    </div>
  );
}
