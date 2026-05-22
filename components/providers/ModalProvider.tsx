// components/providers/ModalProvider.tsx
"use client";

import EmailCheckDialog from "@/components/auth/email-check-dialog";
import SignInDialog from "@/components/auth/sign-in-dialog";
import SignUpDialog from "@/components/auth/sign-up-dialog";
import ForgotPasswordDialog from "@/components/auth/forgot-password-dialog";

export function ModalProvider() {
  return (
    <>
      <EmailCheckDialog />
      <SignInDialog />
      <SignUpDialog />
      <ForgotPasswordDialog />
    </>
  );
}
