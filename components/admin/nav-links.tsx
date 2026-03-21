"use client";

import {
  UserGroupIcon,
  Squares2X2Icon,
  RectangleStackIcon,
  MicrophoneIcon,
  TagIcon,
  BellAlertIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { useLeaveConfirm } from "@/components/LeaveConfirmProvider";
import { useEffect, useRef } from "react";
import { ClipboardList } from "lucide-react";

const links = [
  { name: "信息概况", href: "/admin", icon: Squares2X2Icon },
  {
    name: "合集管理",
    href: "/admin/podcasts",
    icon: RectangleStackIcon,
  },
  {
    name: "音频管理",
    href: "/admin/episodes",
    icon: MicrophoneIcon,
  },
  { name: "标签管理", href: "/admin/tags", icon: TagIcon },
  { name: "用户管理", href: "/admin/users", icon: UserGroupIcon },
  { name: "系统通知", href: "/admin/notifications", icon: BellAlertIcon },
  { name: "访问日志", href: "/admin/logs", icon: ClipboardList },
];

const extractPathSegment = (path: string): string =>
  path.split("/").slice(0, 3).join("/");

export default function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const { needConfirm, setNeedConfirm } = useLeaveConfirm();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingNavigation = useRef<string | null>(null);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    // 关闭抽屉（移动端）
    const drawer = document.getElementById("admin-drawer") as HTMLInputElement;
    if (drawer) drawer.checked = false;

    if (needConfirm) {
      e.preventDefault(); // 阻止 Link 默认行为
      pendingNavigation.current = href;
      dialogRef.current?.showModal();
    }
  };

  const handleConfirm = () => {
    const targetHref = pendingNavigation.current;
    if (targetHref !== null) {
      setNeedConfirm(false);
      router.push(targetHref);
      pendingNavigation.current = null; // 导航后重置
    }
    dialogRef.current?.close();
  };

  const handleCancel = () => {
    dialogRef.current?.close();
  };

  // 确保对话框关闭时清理 pendingNavigation
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      pendingNavigation.current = null;
    };

    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, []);

  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={(e) => handleNavClick(e, link.href)}
            className={clsx(
              "flex h-[48px] items-center justify-start gap-3 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary",
              {
                "bg-primary/10 text-primary":
                  extractPathSegment(pathname) === link.href,
                "text-base-content/70":
                  extractPathSegment(pathname) !== link.href,
              },
            )}
          >
            <LinkIcon className="w-6" />
            <p className="block">{link.name}</p>
          </Link>
        );
      })}

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">确认离开</h3>
          <p className="py-4">确定要离开当前页面吗？未保存的内容将会丢失。</p>
          <div className="modal-action">
            <button className="btn" onClick={handleCancel}>
              取消
            </button>
            <button className="btn btn-primary" onClick={handleConfirm}>
              确定
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleCancel}>关闭</button>
        </form>
      </dialog>
    </>
  );
}
