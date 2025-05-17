"use client";
import React, { useState } from "react";
import SignInForm from "@/components/auth/sign-in-form";

export default function SignInDialog() {
  const [modalKey, setModalKey] = useState(0);

  // 关闭模态框,  重新挂载子组件
  const handleClose = () => {
    setModalKey((prev) => prev + 1); // 改变 key 会重新挂载子组件
  };
  return (
    <dialog id="sign_in_modal_box" className="modal">
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
