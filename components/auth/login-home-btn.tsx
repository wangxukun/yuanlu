"use client";
// 新建客户端组件
import { useSession, signOut } from "next-auth/react";
import { UserIcon, UserCircleIcon } from "@heroicons/react/24/solid";

export default function LoginHomeBtn() {
  const { data: session } = useSession();

  if (session) {
    return (
      <button
        className="flex items-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors"
        onClick={() => signOut({ redirectTo: "/home" })}
      >
        <UserCircleIcon className="w-5 h-5 text-purple-700" />
        <span className="text-sm font-medium text-gray-700">退出</span>
      </button>
    );
  }

  return (
    <>
      <button
        className="bg-purple-700 w-[80px] h-7 text-white flex items-center justify-center space-x-1 px-3 py-1 hover:drop-shadow-md rounded-lg transition-colors"
        onClick={() => {
          const modal = document.getElementById(
            "email_check_modal_box",
          ) as HTMLDialogElement;
          if (modal) {
            modal.showModal();
          }
        }}
      >
        <UserIcon className="w-3 h-3" />
        <span className="text-xs font-bold">登录</span>
      </button>
    </>
  );
}
