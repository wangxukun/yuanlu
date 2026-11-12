"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, X } from "lucide-react";

// ---------------------------------------------------------------------------
// 全站公告横幅 —— 广播收件箱只覆盖注册用户,游客(未登录)拿不到通知行,
// 游客可达的公告走这条横幅:内容与 /app 落地页同源,点击跳转。
// 换公告时改 id(变了会对所有人重新展示,旧的关闭状态失效)+ 文案 + 链接。
//
// [暂时下线 2026-11-12] 小程序主体升级停服中,「正式上线」公告与实况矛盾
// （已发退款致歉广播）——公告暂时下线,横幅不再渲染。恢复:改回 true 即可。
// ---------------------------------------------------------------------------
const ANNOUNCEMENT_ENABLED = false;

const ANNOUNCEMENT = {
  id: "weapp-launch-2026-10",
  text: "远路播客微信小程序正式上线：微信扫码即用，账号与会员权益互通",
  href: "/app",
};
const STORAGE_KEY = "yuanlu:announcement-dismissed";

export default function AnnouncementBanner() {
  const [visible, setVisible] = useState(ANNOUNCEMENT_ENABLED);

  // SSR 恒渲染(游客无闪跳),挂载后按 localStorage 隐藏已关闭者
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === ANNOUNCEMENT.id) {
      setVisible(false);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, ANNOUNCEMENT.id);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="w-full bg-primary-600 dark:bg-primary-700 text-white text-sm">
      <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2 relative">
        <Megaphone className="w-4 h-4 shrink-0" />
        <Link
          href={ANNOUNCEMENT.href}
          className="truncate py-0.5 hover:underline"
        >
          {ANNOUNCEMENT.text}
          <span className="ml-1 font-bold whitespace-nowrap">查看详情 →</span>
        </Link>
        <button
          onClick={dismiss}
          aria-label="关闭公告"
          className="absolute right-2 p-1 rounded-lg hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
