"use client";

import { useState } from "react";
import {
  UserMinusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

export default function DeleteAccountCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/self-delete", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "注销失败");
      }

      toast.success("账号已成功注销");
      setIsModalOpen(false);
      // 登出并重定向到首页
      await signOut({ callbackUrl: "/" });
    } catch (error: unknown) {
      toast.error((error as Error).message || "注销失败，请重试");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-ink-900 rounded-2xl border border-ink-200 dark:border-ink-800 overflow-hidden shadow-sm">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-error-50 dark:bg-error-900/30 flex items-center justify-center">
              <UserMinusIcon className="w-5 h-5 text-error-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-error-600 dark:text-error-500 text-sm">
                注销账号
              </h4>
              <span className="text-xs sm:text-sm text-ink-500 dark:text-ink-400 mt-0.5 block truncate sm:whitespace-normal">
                永久删除您的账号及所有相关数据，此操作不可逆。
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 hover:bg-error-100 dark:hover:bg-error-900/40 rounded-xl transition-colors shrink-0"
          >
            注销账号
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error-50 dark:bg-error-900/30 mx-auto mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-error-600 dark:text-error-500" />
              </div>
              <h3 className="text-lg font-bold text-center text-ink-900 dark:text-ink-100 mb-2">
                确认注销账号？
              </h3>
              <p className="text-sm text-ink-600 dark:text-ink-400 text-center mb-6">
                您的个人资料、学习记录、收藏等所有数据将被永久删除，且无法恢复。请确认您要继续此操作。
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 font-medium hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-error-600 hover:bg-error-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeleting ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "确认注销"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
