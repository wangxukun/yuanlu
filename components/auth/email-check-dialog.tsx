"use client";

import React, { useEffect, useRef, useState } from "react";
import EmailCheckForm from "@/components/auth/email-check-form";
import { useSession } from "next-auth/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function EmailCheckDialog() {
  const [modalKey, setModalKey] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { status } = useSession();

  // 关闭时重置表单状态
  const handleClose = () => {
    setModalKey((prev) => prev + 1);
  };

  useEffect(() => {
    // 如果已经登录，则不显示对话框 (虽然 render 处也有判断，但此处用于逻辑防御)
    if (status === "authenticated") return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleFocus = () => {
      // 增加延迟确保 DOM 完全更新后再设置焦点
      setTimeout(() => {
        const emailInput = dialog.querySelector(
          "input[type='email']",
        ) as HTMLInputElement;
        if (emailInput) {
          emailInput.focus();
          if (emailInput.value) {
            emailInput.select(); // 选中所有文本，提升用户体验
          }
        }
      }, 100);
    };

    // 使用 MutationObserver 监听 showModal 后的聚焦
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "open"
        ) {
          if (dialog.open) {
            handleFocus();
          }
        }
      });
    });

    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });

    // 组件卸载时断开观察器
    return () => observer.disconnect();
  }, [status]);

  // 已登录状态下不渲染
  if (status === "authenticated") {
    return null;
  }

  return (
    <dialog
      id="email_check_modal_box"
      className="modal backdrop-blur-sm bg-base-300/30 transition-all duration-300"
      ref={dialogRef}
    >
      <div className="modal-box p-0 rounded-3xl shadow-2xl bg-base-100 max-w-md w-full overflow-hidden relative">
        {/* Header 区域 */}
        <div className="relative px-8 pt-8 pb-2 text-center">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            验证邮箱
          </h3>
          <p className="text-sm text-base-content/60 mt-2">
            请输入您的邮箱以继续操作
          </p>
          <p className="text-sm text-base-content/70 mb-4">
            已有账户可直接登录，新用户我们将帮助您创建账户
          </p>

          {/* 关闭按钮表单 */}
          <form method="dialog" suppressContentEditableWarning>
            <button
              onClick={handleClose}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-base-content/40 hover:text-base-content hover:bg-base-200 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* 内容区域 */}
        <div className="px-8 pb-10 pt-4">
          <EmailCheckForm key={modalKey} />
        </div>
      </div>

      {/* 点击背景关闭 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>关闭</button>
      </form>
    </dialog>
  );
}
