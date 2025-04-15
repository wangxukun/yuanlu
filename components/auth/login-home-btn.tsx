"use client";
// 新建客户端组件
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { UserIcon, UserCircleIcon } from "@heroicons/react/24/solid";

export default function LoginHomeBtn() {
  const { data: session } = useSession();
  if (session) {
    return (
      <button
        className="flex items-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors"
        onClick={() => signOut()}
      >
        <UserCircleIcon className="w-8 h-8 text-purple-700" />
      </button>
    );
  }

  return (
    <button
      className="sm:bg-purple-700 sm:w-[140px] h-7 text-white flex items-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors"
      onClick={() => redirect("/auth/login")}
    >
      <UserIcon className="hidden sm:block sm:w-3 h-3" />
      <span className="text-xs text-purple-700 sm:text-white font-bold sm:inline">
        登录
      </span>
    </button>
  );
}
