"use client";

import React, { useEffect } from "react";
import { useDialogStore } from "@/store/dialog-store";

export default function PromptBox({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  const { showRegisterSuccessPrompt, setShowRegisterSuccessPrompt } =
    useDialogStore();
  useEffect(() => {
    setTimeout(() => {
      setShowRegisterSuccessPrompt(false);
    }, 3000);
  }, [showRegisterSuccessPrompt]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="flex flex-col w-full max-w-md items-center bg-white justify-center p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-500">{title}</h2>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}
