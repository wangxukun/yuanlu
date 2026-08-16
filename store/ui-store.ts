import { create } from "zustand";

interface UIState {
  isPremiumModalOpen: boolean;
  openPremiumModal: (source?: string) => void;
  closePremiumModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isPremiumModalOpen: false,
  openPremiumModal: (source?: string) => {
    set({ isPremiumModalOpen: true });
    // 转化埋点：记录会员弹窗打开及触发来源（episode_audio_download /
    // trial_unlock / trial_complete / speech_quota 等），失败静默不影响 UI
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
  closePremiumModal: () => set({ isPremiumModalOpen: false }),
}));
