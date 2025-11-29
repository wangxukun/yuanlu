"use client"; // 标记为客户端组件
import { SessionProvider } from "next-auth/react";
import { useActivityTracker } from "@/lib/client/ActivityTracker";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // 跟踪用户活动
  useActivityTracker();
  return <SessionProvider>{children}</SessionProvider>;
}
