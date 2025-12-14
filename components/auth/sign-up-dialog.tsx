"use client";

import React, { useState } from "react";
import SignUpForm from "@/components/auth/sign-up-form";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function SignUpDialog() {
  const [modalKey, setModalKey] = useState(0);

  // 关闭模态框时重置表单
  const handleClose = () => {
    setModalKey((prev) => prev + 1);
  };

  return (
    // 更新 ID 为 my_modal_register 以匹配统一的 ID 命名规范
    <dialog
      id="sign_up_modal_box"
      className="modal backdrop-blur-sm bg-base-300/30 transition-all duration-300"
    >
      <div className="modal-box p-0 rounded-3xl shadow-2xl bg-base-100 max-w-md w-full overflow-hidden relative">
        {/* Header */}
        <div className="relative px-8 pt-8 pb-2 text-center">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
            创建账号
          </h3>
          <p className="text-sm text-base-content/60 mt-2">
            完善信息，开启您的专属旅程
          </p>

          <form method="dialog">
            <button
              onClick={handleClose}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-base-content/40 hover:text-base-content hover:bg-base-200 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Body */}
        <div className="px-8 pb-10 pt-4">
          <SignUpForm key={modalKey} />
        </div>
      </div>

      {/* 点击背景关闭 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>关闭</button>
      </form>
    </dialog>
  );
}
