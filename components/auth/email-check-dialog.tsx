"use client";
import EmailCheckForm from "@/components/auth/email-check-form";
import React, { useEffect, useRef, useState } from "react";

export default function EmailCheckDialog() {
  const [modalKey, setModalKey] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 关闭模态框,  重新挂载子组件
  const handleClose = () => {
    setModalKey((prev) => prev + 1); // 改变 key 会重新挂载子组件
  };

  // 监听模态框的打开事件
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) {
      const handleOpen = () => {
        console.log("modal opened");
        // 手动触发焦点设置逻辑
        const emailInput = dialog.querySelector(
          "input[type='email']",
        ) as HTMLInputElement;
        if (emailInput) {
          emailInput.focus();
        }
      };
      dialog.addEventListener("open", handleOpen);
      return () => {
        dialog.removeEventListener("open", handleOpen);
      };
    }
  }, []);

  return (
    <dialog id="email_check_modal_box" className="modal" ref={dialogRef}>
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
        <EmailCheckForm key={modalKey} />
        {/* 例如放置 <LoginDialog /> */}
      </div>
    </dialog>
  );
}
