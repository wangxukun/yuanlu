// 在后台管理控制台使用
"use client";
// 新建客户端组件
import { useSession, signOut } from "next-auth/react";
import { PowerIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export default function LoginBtn() {
  const { data: session } = useSession();
  const router = useRouter();
  if (session) {
    return (
      <button
        className="flex h-[48px] w-full grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3"
        onClick={async () => {
          await signOut({ redirect: false });
          router.push("/home");
        }}
      >
        <PowerIcon className="w-6" />
        <div className="hidden md:block">退出</div>
      </button>
    );
  }

  return (
    <button
      className="flex h-[48px] w-full grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3"
      onClick={() => router.push("/home")}
    >
      <PowerIcon className="w-6" />
      <div className="hidden md:block">登录</div>
    </button>
  );
}
