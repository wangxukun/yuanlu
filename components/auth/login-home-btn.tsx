"use client";
// 新建客户端组件
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { PowerIcon } from "@heroicons/react/24/outline";

export default function LoginHomeBtn() {
  const { data: session } = useSession();
  if (session) {
    return (
      <button
        className="flex items-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors"
        onClick={() => signOut()}
      >
        <PowerIcon className="w-6" />
        <span className="hidden sm:inline text-slate-600">退出</span>
      </button>
    );
  }

  return (
    <button
      className="flex items-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors"
      onClick={() => redirect("/auth/login")}
    >
      <PowerIcon className="w-6" />
      <span className="hidden sm:inline text-slate-600">登录</span>
    </button>
  );
}
