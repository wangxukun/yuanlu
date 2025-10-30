"use client";
import EmailCheckForm from "@/components/auth/email-check-form";
import React, { useEffect, useRef, useState } from "react";

export default function EmailCheckDialog() {
  const [modalKey, setModalKey] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleClose = () => {
    setModalKey((prev) => prev + 1);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleFocus = () => {
      // 增加延迟确保DOM完全更新后再设置焦点
      setTimeout(() => {
        const emailInput = dialog.querySelector(
          "input[type='email']",
        ) as HTMLInputElement;
        if (emailInput) {
          emailInput.focus();
          emailInput.select(); // 选中所有文本，提升用户体验
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
    <dialog id="email_check_modal_box" className="modal" ref={dialogRef}>
      <div className="modal-box bg-base-100 text-base-content relative">
        <form method="dialog">
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          >
            ✕
          </button>
        </form>
        <EmailCheckForm key={modalKey} />
      </div>
      {/* 点击背景关闭 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>关闭</button>
      </form>
    </dialog>
  );
}
