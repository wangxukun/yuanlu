"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { X, Crown } from "lucide-react";
import { useUIStore } from "@/store/ui-store";

export default function PremiumModal() {
  const { isPremiumModalOpen, closePremiumModal } = useUIStore();
  const router = useRouter();

  if (!isPremiumModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-350">
      {/* Blur-glass backdrop */}
      <div
        className="absolute inset-0 bg-base-300/60 backdrop-blur-md cursor-pointer"
        onClick={closePremiumModal}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-base-100 rounded-[2.5rem] p-8 sm:p-10 max-w-sm w-full border border-base-250/60 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
        {/* Close Button X */}
        <button
          onClick={closePremiumModal}
          className="absolute right-6 top-6 p-2 rounded-xl text-base-content/40 hover:text-base-content hover:bg-base-200 transition-colors active:scale-95"
          aria-label="关闭"
        >
          <X size={20} />
        </button>

        {/* Glowing Icon Block */}
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
          <Crown size={28} className="animate-pulse" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black text-base-content mb-3 tracking-tight">
          这里是会员专享频道。
        </h3>

        {/* Content description based on Scheme 3 (resonance) */}
        <p className="text-sm text-base-content/75 leading-relaxed font-semibold mb-8 px-1">
          为了支持网站长期高质量运行，此功能仅向赞助会员开放。如果您喜欢这里的内容，欢迎加入我们的会员社区，支持独立创作并享受专属权益。
        </p>

        {/* Action buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={() => {
              closePremiumModal();
              router.push("/auth/subscribe");
            }}
            className="w-full btn btn-primary h-12 rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            去看看赞助方案
          </button>

          <button
            onClick={closePremiumModal}
            className="btn btn-ghost w-full h-12 rounded-2xl text-xs font-bold text-base-content/40 hover:text-base-content hover:bg-base-200/50 transition-colors"
          >
            暂不加入
          </button>
        </div>
      </div>
    </div>
  );
}
