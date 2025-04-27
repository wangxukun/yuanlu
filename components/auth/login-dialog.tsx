"use client";
import LoginForm from "@/components/auth/login-form";
import { useEffect, useRef, useState } from "react";

export default function LoginDialog({
  onCloseLoginDialog,
  onOpenRegisterDialog,
}: {
  onCloseLoginDialog?: () => void;
  onOpenRegisterDialog?: () => void;
}) {
  const [onShowLoginDialog] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        onCloseLoginDialog?.();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onShowLoginDialog]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={dialogRef} className="bg-white rounded-lg p-6 w-full max-w-md">
        <LoginForm
          onOpenRegisterDialog={onOpenRegisterDialog}
          onCloseLoginDialog={onCloseLoginDialog}
        />
      </div>
    </div>
  );
}
