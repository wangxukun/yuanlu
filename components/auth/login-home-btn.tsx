"use client";
import { useSession, signOut } from "next-auth/react";
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export default function LoginHomeBtn() {
  const { data: session } = useSession();
  const router = useRouter();

  if (session) {
    return (
      <button
        className="btn btn-ghost btn-sm gap-2 text-base-content/80 hover:text-base-content hover:bg-base-200"
        onClick={async () => {
          await signOut({ redirect: false });
          router.push("/browse");
        }}
        title="退出登录"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
        <span className="hidden xl:inline text-sm font-medium">退出</span>
      </button>
    );
  }

  return (
    <button
      className="btn btn-primary btn-sm gap-2 shadow-sm shadow-primary/20"
      onClick={() => {
        const modal = document.getElementById(
          "email_check_modal_box",
        ) as HTMLDialogElement;
        if (modal) {
          modal.showModal();
        }
      }}
    >
      <UserCircleIcon className="w-5 h-5" />
      <span>登录</span>
    </button>
  );
}
