"use client";
import React, { useEffect, useRef, useState } from "react";
import SignInForm from "@/components/auth/sign-in-form";

export default function SignInDialog() {
  const [modalKey, setModalKey] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 关闭模态框,  重新挂载子组件
  const handleClose = () => {
    setModalKey((prev) => prev + 1); // 改变 key 会重新挂载子组件
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleFocus = () => {
      // 增加延迟确保DOM完全更新后再设置焦点
      setTimeout(() => {
        const passwordInput = dialog.querySelector(
          "input[type='password']",
        ) as HTMLInputElement;
        if (passwordInput) {
          passwordInput.focus();
          passwordInput.select(); // 选中所有文本，提升用户体验
        }
      }, 100);
    };

    // 监听 showModal 后的聚焦
    const observer = new MutationObserver(() => {
      if (dialog.open) handleFocus();
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });

    // 组件卸载时断开观察器
    return () => observer.disconnect();
  }, []);

  return (
    <dialog id="sign_in_modal_box" className="modal" ref={dialogRef}>
      <div className="modal-box">
        <form method="dialog" className="mb-4">
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          >
            ✕
          </button>
        </form>
        {/*<h3 className="font-bold text-lg">欢迎登录</h3>*/}
        <SignInForm key={modalKey} />
        {/* 例如放置 <LoginDialog /> */}
      </div>
    </dialog>
  );
}
