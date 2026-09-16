import { create } from "zustand";
import type { PremiumModalVars } from "@/components/subscription/premium-modal-scenarios";

interface UIState {
  isPremiumModalOpen: boolean;
  /** 当前弹窗的触发场景（PremiumModal 按 source 渲染场景化文案，P2-1） */
  premiumModalSource: string | null;
  /** 场景文案的个性化变量（{var} 占位符取值，如 avgScore / totalErrors） */
  premiumModalVars: PremiumModalVars | null;
  openPremiumModal: (source?: string, vars?: PremiumModalVars) => void;
  closePremiumModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isPremiumModalOpen: false,
  premiumModalSource: null,
  premiumModalVars: null,
  openPremiumModal: (source?: string, vars?: PremiumModalVars) => {
    set({
      isPremiumModalOpen: true,
      premiumModalSource: source ?? null,
      premiumModalVars: vars ?? null,
    });
    // 转化埋点：记录会员弹窗打开及触发来源（episode_audio_download /
    // trial_unlock / trial_complete / speech_quota / vocabulary_total 等），
    // 失败静默不影响 UI。source 为 varchar，新场景零迁移。
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "PREMIUM_MODAL_OPEN",
        source: source ?? "unknown",
      }),
      keepalive: true,
    }).catch(() => {});
  },
  closePremiumModal: () =>
    set({
      isPremiumModalOpen: false,
      premiumModalSource: null,
      premiumModalVars: null,
    }),
}));
