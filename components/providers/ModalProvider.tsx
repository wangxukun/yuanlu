// components/providers/ModalProvider.tsx
"use client";

import EmailCheckDialog from "@/components/auth/email-check-dialog";
import SignInDialog from "@/components/auth/sign-in-dialog";
import SignUpDialog from "@/components/auth/sign-up-dialog";
import ForgotPasswordDialog from "@/components/auth/forgot-password-dialog";
import PremiumModal from "@/components/subscription/PremiumModal";
// [P3-a] 句子配额触墙浮卡 + 暂存自动补提交（全局单例）
import SentenceStagingManager from "@/components/subscription/SentenceStagingManager";

export function ModalProvider() {
  return (
    <>
      <EmailCheckDialog />
      <SignInDialog />
      <SignUpDialog />
      <ForgotPasswordDialog />
      <PremiumModal />
      <SentenceStagingManager />
    </>
  );
}
