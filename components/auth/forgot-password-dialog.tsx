"use client";

import React, { useEffect, useRef, useState } from "react";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";
import PhoneResetPasswordForm from "@/components/auth/PhoneResetPasswordForm";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function ForgotPasswordDialog() {
  const [modalKey, setModalKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleClose = () => {
    setModalKey((prev) => prev + 1);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleFocus = () => {
      setTimeout(() => {
        const codeInput = dialog.querySelector(
          "input[placeholder='6位验证码']",
        ) as HTMLInputElement;
        if (codeInput) {
          codeInput.focus();
        }
      }, 100);
    };

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
    <dialog
      id="forgot_password_modal_box"
      className="modal backdrop-blur-sm bg-base-300/30 transition-all duration-300"
      ref={dialogRef}
    >
      <div className="modal-box p-0 rounded-3xl shadow-2xl bg-base-100 max-w-md w-full overflow-hidden relative">
        {/* Header Section */}
        <div className="relative px-8 pt-8 pb-2 text-center">
          <h3 className="text-2xl font-bold text-primary">重置您的密码</h3>
          <p className="text-sm text-base-content/60 mt-2">请选择找回方式</p>

          {/* Tab switcher */}
          <div
            role="tablist"
            className="tabs tabs-boxed bg-base-200/50 dark:bg-ink-900/50 p-1 rounded-xl w-full grid grid-cols-2 gap-1 mt-5"
          >
            <button
              role="tab"
              className={`tab h-10 rounded-lg transition-all ${
                activeTab === "email"
                  ? "bg-white dark:bg-ink-800 shadow-sm !text-primary-600 dark:!text-primary-400 font-bold"
                  : "text-base-content/60 hover:text-base-content"
              }`}
              onClick={() => setActiveTab("email")}
            >
              Email 找回
            </button>
            <button
              role="tab"
              className={`tab h-10 rounded-lg transition-all ${
                activeTab === "phone"
                  ? "bg-white dark:bg-ink-800 shadow-sm !text-primary-600 dark:!text-primary-400 font-bold"
                  : "text-base-content/60 hover:text-base-content"
              }`}
              onClick={() => setActiveTab("phone")}
            >
              手机号找回
            </button>
          </div>

          {/* Close button */}
          <form method="dialog">
            <button
              onClick={handleClose}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-base-content/40 hover:text-base-content hover:bg-base-200 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Content Section */}
        <div className="px-8 pb-10 pt-4">
          {activeTab === "email" ? (
            <ForgotPasswordForm key={`email-${modalKey}`} />
          ) : (
            <PhoneResetPasswordForm key={`phone-${modalKey}`} />
          )}
        </div>
      </div>

      {/* Click backdrop to close */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>关闭</button>
      </form>
    </dialog>
  );
}
