"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  readPendingPayment,
  clearPendingPayment,
  fetchSubscriptionStatus,
  detectActivation,
} from "@/lib/client/subscription-activation";

const STORAGE_KEY = "subscription_flash_message";

/**
 * Global component that checks sessionStorage on every route change for a
 * pending subscription activation message and displays it via sonner toast.
 *
 * This is needed because the subscribe page redirects after payment
 * activation, so an in-page banner cannot survive the navigation.
 * The message is written by SubscribeClient's polling logic and
 * consumed here on whichever page the user lands on after redirect.
 *
 * [P2-2/F5] 支付回流保障：用户付费后关掉订阅页签也不断链——每次路由变化
 * 检查 localStorage 的"待确认支付"记录（点击支付时由订阅页写入基线快照），
 * 命中激活则补播祝贺 + 强刷会话（P1-2 链路），并清理记录。
 */
export default function SubscriptionFlashToast() {
  const pathname = usePathname();
  const router = useRouter();
  const { update: updateSession } = useSession();

  useEffect(() => {
    const message = sessionStorage.getItem(STORAGE_KEY);
    if (message) {
      sessionStorage.removeItem(STORAGE_KEY);
      // Small delay to ensure the page is fully rendered before toast shows
      setTimeout(() => {
        toast.success(message, {
          duration: 8000,
        });
      }, 500);
    }
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const record = readPendingPayment();
      if (!record) return;
      const snap = await fetchSubscriptionStatus();
      if (cancelled || !snap) return;
      const detected = detectActivation(record, snap);
      if (detected) {
        clearPendingPayment();
        toast.success(detected.message, { duration: 8000 });
        // role 同步沿用 P1-2 链路：update() 触发服务端按订阅事实重新派生
        await updateSession();
        router.refresh();
      }
    })().catch(() => {
      // 网络失败等场景静默：记录保留，下次路由变化再试
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, updateSession, router]);

  return null;
}
