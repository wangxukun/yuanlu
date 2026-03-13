// components/providers/ModalProvider.tsx
"use client";

import EmailCheckDialog from "@/components/auth/email-check-dialog";
import SignInDialog from "@/components/auth/sign-in-dialog";
import SignUpDialog from "@/components/auth/sign-up-dialog";

export function ModalProvider() {
  return (
    <>
      <EmailCheckDialog />
      <SignInDialog />
      <SignUpDialog />
    </>
  );
}
