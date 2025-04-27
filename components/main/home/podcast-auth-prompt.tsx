"use client";
import PodcastIcon from "@/components/icons/PodcastIcon";
import LoginDialog from "@/components/auth/login-dialog";
import RegisterDialog from "@/components/auth/register-dialog";
import PromptBox from "@/components/auth/prompt-box";
import { useState } from "react";

export default function PodcastAuthPrompt() {
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showRegisterSuccessBox, setShowRegisterSuccessBox] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-500 to-purple-700 flex flex-col items-center justify-start p-12">
      <div className="text-center space-y-6 justify-center">
        {/* 标题 */}
        <h1 className="text-4xl font-bold text-white">跟上您的节目</h1>

        <PodcastIcon size={480} fill="fill-white" />

        {/* 描述文字 */}
        <p className="text-pink-200 text-lg leading-relaxed">
          保存您的位置，关注节目并查看最新剧集 - 所有这些都是免费的。
        </p>

        {/* 登录按钮 */}
        <button
          onClick={() => setShowLoginDialog(true)}
          className="
                    mx-auto
            min-w-48
            bg-white
            text-black
            font-medium
            py-3 px-6
            rounded-lg
            shadow-lg
            {/*transform hover:scale-105*/}
            flex items-center justify-center gap-2
          "
        >
          登录
        </button>
      </div>
      {showLoginDialog && (
        <LoginDialog
          onCloseLoginDialog={() => setShowLoginDialog(false)}
          onOpenRegisterDialog={() => {
            setShowLoginDialog(false);
            setShowRegisterDialog(true);
          }}
        />
      )}
      {showRegisterDialog && (
        <RegisterDialog
          onCloseRegisterDialog={() => setShowRegisterDialog(false)}
          onOpenRegisterSuccessBox={() => setShowRegisterSuccessBox(true)}
          onOpenLoginDialog={() => setShowLoginDialog(true)}
        />
      )}
      {showRegisterSuccessBox && (
        <PromptBox
          onClosePromptBox={() => setShowRegisterSuccessBox(false)}
          title="注册成功"
          message="提示将在3秒后关闭"
        />
      )}
    </div>
  );
}
