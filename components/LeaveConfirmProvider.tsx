"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface LeaveConfirmContextValue {
  needConfirm: boolean;
  setNeedConfirm: (v: boolean) => void;
}

const LeaveConfirmContext = createContext<LeaveConfirmContextValue | null>(
  null,
);

export function useLeaveConfirm() {
  const ctx = useContext(LeaveConfirmContext);
  if (!ctx) {
    throw new Error("useLeaveConfirm must be used within LeaveConfirmProvider");
  }
  return ctx;
}

export function LeaveConfirmProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [needConfirm, setNeedConfirm] = useState(false);

  // ✅ 浏览器刷新 / 关闭
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!needConfirm) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [needConfirm]);

  return (
    <LeaveConfirmContext.Provider value={{ needConfirm, setNeedConfirm }}>
      {children}
    </LeaveConfirmContext.Provider>
  );
}
