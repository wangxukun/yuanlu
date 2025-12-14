"use client";

import React, { useEffect, useRef, useState } from "react";
import SignInForm from "@/components/auth/sign-in-form";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function SignInDialog() {
  const [modalKey, setModalKey] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 关闭模态框时, 更新 key 以重新挂载子组件 (重置表单状态)
  const handleClose = () => {
    setModalKey((prev) => prev + 1);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleFocus = () => {
      // 增加延迟确保 DOM 完全更新后再设置焦点
      setTimeout(() => {
        // 查找密码输入框进行聚焦，提升用户体验
        const passwordInput = dialog.querySelector(
          "input[type='password']",
        ) as HTMLInputElement;
        if (passwordInput) {
          passwordInput.focus();
          // 如果输入框有值，选中所有文本方便直接修改
          if (passwordInput.value) {
            passwordInput.select();
          }
        }
      }, 100);
    };

    // 使用 MutationObserver 监听 dialog 的 open 属性变化
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

    return () => observer.disconnect();
  }, []);

  return (
    // ID 更新为 my_modal_login 以匹配 LoginHomeBtn 组件的触发逻辑
    <dialog
      id="sign_in_modal_box"
      className="modal backdrop-blur-sm bg-base-300/30 transition-all duration-300"
      ref={dialogRef}
    >
      <div className="modal-box p-0 rounded-3xl shadow-2xl bg-base-100 max-w-md w-full overflow-hidden relative">
        {/* Header 区域 */}
        <div className="relative px-8 pt-8 pb-2 text-center">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            欢迎回来
          </h3>
          <p className="text-sm text-base-content/60 mt-2">
            登录您的账户，继续精彩旅程
          </p>

          {/* 关闭按钮表单 */}
          <form method="dialog">
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
          {/* 使用 key 强制重新渲染表单组件，确保每次打开都是初始状态 */}
          <SignInForm key={modalKey} />
        </div>
      </div>

      {/* 点击背景关闭 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>关闭</button>
      </form>
    </dialog>
  );
}
