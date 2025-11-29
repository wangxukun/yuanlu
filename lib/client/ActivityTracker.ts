"use client";

import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL = 60 * 1000; // 每 60 秒发送一次心跳
const ACTIVITY_THROTTLE = 60 * 1000; // 用户操作 60 秒内最多记录一次

/**
 * 调用接口更新用户 lastActiveAt + isOnline = true
 */
async function sendActivePing() {
  try {
    await fetch("/api/auth/update-activity", {
      method: "POST",
      keepalive: true, // 页面关闭时也能发出请求
    });
  } catch (err) {
    console.error("Failed to send activity ping:", err);
  }
}

/**
 * 节流函数
 */
function throttle<T extends (...args: Parameters<T>[]) => void>(
  fn: T,
  delay: number,
): T {
  let last = 0;
  return function (...args: Parameters<T>[]) {
    const now = Date.now();
    if (now - last > delay) {
      last = now;
      fn(...args);
    }
  } as T;
}

/**
 * 核心 Activity Tracker Hook
 */
export function useActivityTracker() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 立即发送一次（页面刚加载）
    sendActivePing();

    /**（1）监听用户交互事件 **/
    const handleUserActivity = throttle(() => {
      sendActivePing();
    }, ACTIVITY_THROTTLE);

    const events = [
      "click",
      "scroll",
      "keydown",
      "mousemove",
      "touchstart",
      "visibilitychange",
    ];

    events.forEach((e) => {
      window.addEventListener(e, handleUserActivity);
    });

    /**（2）心跳：页面打开期间每 60 秒发送一次 **/
    const heartbeat = setInterval(() => {
      sendActivePing();
    }, HEARTBEAT_INTERVAL);

    /**（3）页面卸载前发送一次（保证准确下线） **/
    window.addEventListener("beforeunload", sendActivePing);

    return () => {
      events.forEach((e) => {
        window.removeEventListener(e, handleUserActivity);
      });
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", sendActivePing);
    };
  }, []);
}
