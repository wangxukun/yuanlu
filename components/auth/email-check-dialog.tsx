"use client";

import React, { useEffect, useRef, useState } from "react";
import EmailCheckForm from "@/components/auth/email-check-form";
import PhoneAuthForm from "@/components/auth/phone-auth-form";
import { useSession } from "next-auth/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function EmailCheckDialog() {
  const [modalKey, setModalKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"phone" | "email">("phone");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { status } = useSession();

  // 关闭时重置表单状态
  const handleClose = () => {
    setModalKey((prev) => prev + 1);
  };

  useEffect(() => {
    // 如果已经登录，则不显示对话框 (虽然 render 处也有判断，但此处用于逻辑防御)
    if (status === "authenticated") return;

    const dialog = dialogRef.current as any;
    if (!dialog) return;

    // Monkey patch to simulate native <dialog> API
    dialog.showModal = () => {
      dialog.classList.add("modal-open");
      dialog.setAttribute("open", "");
      
      // Handle focus delay
      setTimeout(() => {
        const emailInput = dialog.querySelector("input[type='email']") as HTMLInputElement;
        if (emailInput) {
          emailInput.focus();
          if (emailInput.value) emailInput.select();
        }
      }, 100);
    };

    dialog.close = () => {
      dialog.classList.remove("modal-open");
      dialog.removeAttribute("open");
      setModalKey((prev) => prev + 1); // Reset form state
    };

    // Note: We don't need MutationObserver anymore because we manually handle focus in showModal
  }, [status]);

  // 已登录状态下不渲染
  if (status === "authenticated") {
    return null;
  }

  const handleManualClose = (e?: React.MouseEvent) => {
    e?.preventDefault();
    const dialog = dialogRef.current as any;
    if (dialog && dialog.close) {
      dialog.close();
    }
  };

  return (
    <div
      id="email_check_modal_box"
      className="modal backdrop-blur-sm bg-base-300/30 transition-all duration-300 z-40"
      ref={dialogRef as any}
    >
      <div className="modal-box p-0 rounded-3xl shadow-2xl bg-base-100 max-w-md w-full overflow-hidden relative">
        {/* Header 区域 */}
        <div className="relative px-8 pt-8 pb-2 text-center">
          <h3 className="text-2xl font-bold text-primary">欢迎来到远路播客</h3>
          <p className="text-sm text-base-content/60 mt-2">
            请选择登录方式
          </p>

          {/* 切换 Tab */}
          <div
            role="tablist"
            className="tabs tabs-boxed bg-base-200/50 dark:bg-ink-900/50 p-1 rounded-xl w-full grid grid-cols-2 gap-1 mt-6"
          >
            <button
              role="tab"
              className={`tab h-10 rounded-lg transition-all ${
                activeTab === "phone"
                  ? "bg-white dark:bg-ink-800 shadow-sm !text-primary-600 dark:!text-primary-400 font-bold"
                  : "text-base-content/60 hover:text-base-content"
              }`}
              onClick={() => setActiveTab("phone")}
            >
              手机号注册 / 登录
            </button>
            <button
              role="tab"
              className={`tab h-10 rounded-lg transition-all ${
                activeTab === "email"
                  ? "bg-white dark:bg-ink-800 shadow-sm !text-primary-600 dark:!text-primary-400 font-bold"
                  : "text-base-content/60 hover:text-base-content"
              }`}
              onClick={() => setActiveTab("email")}
            >
              邮箱注册 / 登录
            </button>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={handleManualClose}
            type="button"
            className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-base-content/40 hover:text-base-content hover:bg-base-200 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="px-8 pb-10 pt-4">
          {activeTab === "phone" ? (
            <PhoneAuthForm key={`phone-${modalKey}`} />
          ) : (
            <EmailCheckForm key={`email-${modalKey}`} />
          )}
        </div>
      </div>

      {/* 点击背景关闭 */}
      <div className="modal-backdrop" onClick={handleManualClose}>
        <button className="hidden">关闭</button>
      </div>
    </div>
  );
}
