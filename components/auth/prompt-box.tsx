"use client";

import React, { useEffect } from "react";

export default function PromptBox({
  onClosePromptBox,
  title,
  message,
}: {
  onClosePromptBox: () => void;
  title: string;
  message: string;
}) {
  useEffect(() => {
    setTimeout(() => {
      onClosePromptBox();
    }, 3000);
  }, [onClosePromptBox]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="flex flex-col w-full max-w-md items-center bg-white justify-center p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-500">{title}</h2>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}
