// 导入create函数，用于创建 Zustand store
import { create } from "zustand";

interface AuthState {
  checkedEmail: string;
  setCheckedEmail: (email: string) => void;
}

// 使用create函数创建一个Zustand store，并导出useAuthStore钩子
export const useAuthStore = create<AuthState>((set) => ({
  checkedEmail: "",
  setCheckedEmail: (email: string) => set({ checkedEmail: email }),
}));
