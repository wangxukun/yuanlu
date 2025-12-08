"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterSuccess() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/admin/podcasts");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="bg-gray-50 rounded-xl p-6 w-full max-w-7xl mx-auto mt-40">
      <div className="flex flex-col items-center justify-center space-y-4">
        <h2 className="text-lg font-bold text-slate-500">删除成功</h2>
        <p className="text-sm text-gray-500">删除成功，将在3秒后跳转...</p>
      </div>
    </div>
  );
}
