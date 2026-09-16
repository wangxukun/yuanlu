"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, X } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import {
  getPremiumScenario,
  renderSocialProof,
  type SocialProofStats,
} from "./premium-modal-scenarios";

// [P2-6] 社会认同文案模块级缓存：同一会话内多次开弹窗不重复请求
let socialProofCache: { text: string; fetchedAt: number } | null = null;
const SOCIAL_PROOF_CACHE_TTL = 10 * 60 * 1000;

export default function PremiumModal() {
  const {
    isPremiumModalOpen,
    closePremiumModal,
    premiumModalSource,
    premiumModalVars,
  } = useUIStore();
  const router = useRouter();
  const [socialProof, setSocialProof] = useState(
    socialProofCache &&
      Date.now() - socialProofCache.fetchedAt < SOCIAL_PROOF_CACHE_TTL
      ? socialProofCache.text
      : "",
  );

  // [P2-6/F8] 社会认同钩子：真实数据源 /api/stats/social-proof（ISR 10 分钟），
  // 门槛不足或取数失败时 renderSocialProof 返回空串、整行不渲染
  useEffect(() => {
    if (
      socialProofCache &&
      Date.now() - socialProofCache.fetchedAt < SOCIAL_PROOF_CACHE_TTL
    ) {
      setSocialProof(socialProofCache.text);
      return;
    }
    let cancelled = false;
    fetch("/api/stats/social-proof")
      .then((r) => r.json())
      .then((data: SocialProofStats) => {
        const text = renderSocialProof(data);
        socialProofCache = { text, fetchedAt: Date.now() };
        if (!cancelled) setSocialProof(text);
      })
      .catch(() => {
        // 营销钩子静默降级，绝不影响弹窗主流程
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isPremiumModalOpen) return null;

  // [P2-1/F1] 按触发 source 渲染场景化权益文案；未知 source 走通用兜底
  const scenario = getPremiumScenario(premiumModalSource, premiumModalVars);
  const HeaderIcon = scenario.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-350">
      {/* Blur-glass backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md cursor-pointer"
        onClick={closePremiumModal}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-base-100 rounded-xl p-8 sm:p-10 max-w-sm w-full border border-base-200 shadow-e3 animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
        {/* Close Button X */}
        <button
          onClick={closePremiumModal}
          className="absolute right-6 top-6 p-2 rounded-xl text-base-content opacity-40 hover:opacity-100 hover:bg-base-200 transition-colors active:scale-95"
          aria-label="关闭"
        >
          <X size={20} />
        </button>

        {/* Glowing Icon Block */}
        <div className="w-16 h-16 bg-primary-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20">
          <HeaderIcon size={28} className="animate-pulse" />
        </div>

        {/* Scenario Title */}
        <h3 className="text-2xl font-black text-base-content mb-3 tracking-tight">
          {scenario.title}
        </h3>

        {/* Scenario description */}
        <p className="text-sm text-base-content opacity-75 leading-relaxed font-semibold mb-6 px-1">
          {scenario.description}
        </p>

        {/* Scenario benefits */}
        <ul className="w-full space-y-2.5 mb-6">
          {scenario.benefits.map((benefit) => {
            const BenefitIcon = benefit.icon;
            return (
              <li
                key={benefit.text}
                className="flex items-center gap-3 text-sm font-semibold text-base-content"
              >
                <span className="w-8 h-8 shrink-0 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                  <BenefitIcon size={16} />
                </span>
                {benefit.text}
              </li>
            );
          })}
        </ul>

        {/* Price anchor */}
        <p className="text-xs font-bold text-primary-600 dark:text-primary-400 tracking-wide mb-6">
          {scenario.priceAnchor}
        </p>

        {/* Action buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={() => {
              closePremiumModal();
              router.push("/auth/subscribe");
            }}
            className="w-full btn bg-primary-600 hover:bg-primary-700 border-none text-white h-12 rounded-2xl text-sm font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {scenario.cta}
          </button>

          <button
            onClick={closePremiumModal}
            className="btn btn-ghost w-full h-12 rounded-2xl text-xs font-bold text-base-content opacity-40 hover:opacity-100 hover:bg-base-200 transition-colors"
          >
            暂不加入
          </button>
        </div>

        {/* [P2-6] 社会认同钩子：文案与订阅页条带同源（premium-modal-scenarios.ts） */}
        {socialProof && (
          <p className="mt-5 text-[11px] font-semibold text-base-content/50 flex items-center justify-center gap-1.5">
            <Users size={12} className="text-primary-500" />
            {socialProof}
          </p>
        )}
      </div>
    </div>
  );
}
