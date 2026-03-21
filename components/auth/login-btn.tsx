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
        className="flex h-[48px] w-full items-center justify-start gap-3 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-error/10 hover:text-error text-base-content/70"
        onClick={async () => {
          await signOut({ redirect: false });
          router.push("/home");
        }}
      >
        <PowerIcon className="w-6" />
        <p className="block">退出</p>
      </button>
    );
  }

  return (
    <button
      className="flex h-[48px] w-full items-center justify-start gap-3 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary text-base-content/70"
      onClick={() => router.push("/home")}
    >
      <PowerIcon className="w-6" />
      <p className="block">登录</p>
    </button>
  );
}
