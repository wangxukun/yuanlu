import { create } from "zustand";

interface LoginDialogState {
  showLoginDialog: boolean;
  showRegisterDialog: boolean;
  showRegisterSuccessPrompt: boolean;
  setShowLoginDialog: (show: boolean) => void;
  setShowRegisterDialog: (show: boolean) => void;
  setShowRegisterSuccessPrompt: (show: boolean) => void;
}

export const useDialogStore = create<LoginDialogState>((set) => ({
  showLoginDialog: false,
  showRegisterDialog: false,
  showRegisterSuccessPrompt: false,
  setShowLoginDialog: (show) => set({ showLoginDialog: show }),
  setShowRegisterDialog: (show) => set({ showRegisterDialog: show }),
  setShowRegisterSuccessPrompt: (show) =>
    set({ showRegisterSuccessPrompt: show }),
}));
