"use client";

import { SessionProvider } from "next-auth/react";
import { useActivityTracker } from "@/lib/client/ActivityTracker";

// 1. 创建一个子组件专门用于触发 hook
function ActivityTrackerRunner() {
  // 因为这个组件被放在 SessionProvider 内部，所以这里可以安全地调用 useSession
  useActivityTracker();
  return null; // 这个组件不需要渲染任何 UI
}

// 2. AuthProvider 只负责提供 Context
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      {/* 3. 将 Runner 放在 Provider 内部 */}
      <ActivityTrackerRunner />
      {children}
    </SessionProvider>
  );
}
