"use client";
import LoginForm from "@/components/auth/login-form";
import { useEffect, useRef } from "react";

export default function LoginDialog({
  onLoginDialogClose,
}: {
  onLoginDialogClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        onLoginDialogClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onLoginDialogClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={dialogRef} className="bg-white rounded-lg p-6 w-full max-w-md">
        <LoginForm onSuccess={onLoginDialogClose} />
      </div>
    </div>
  );
}
