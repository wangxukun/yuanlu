"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  ClipboardCopy,
  Send,
  ArrowUpRight,
  HelpCircle,
  UserCheck,
  AlertTriangle,
  Crown,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const AFDIAN_PLANS = [
  {
    level: "WEEKLY",
    name: "周度会员",
    price: 5,
    days: 7,
    months: 1,
    desc: "7天高级会员权益，低门槛体验所有专业功能",
    planKey: "WEEKLY",
    features: [
      "7天会员特权",
      "双语动态字幕",
      "专属播客畅听",
      "音频、文稿下载",
      "语音跟读评测",
      "生词无限收藏",
      "语速调节、单句循环",
    ],
  },
  {
    level: "MONTHLY",
    name: "月度会员",
    price: 18,
    days: 30,
    months: 1,
    desc: "30天高级会员权益，适合中短期高强度需求",
    planKey: "MONTHLY",
    features: [
      "30天会员特权",
      "双语动态字幕",
      "专属播客畅听",
      "音频、文稿下载",
      "语音跟读评测",
      "生词无限收藏",
      "语速调节、单句循环",
    ],
  },
  {
    level: "QUARTERLY",
    name: "季度会员",
    price: 48,
    days: 90,
    months: 3,
    desc: "90天高级会员权益，季付更划算，效率倍增",
    planKey: "QUARTERLY",
    features: [
      "90天会员特权",
      "双语动态字幕",
      "专属播客畅听",
      "音频、文稿下载",
      "语音跟读评测",
      "生词无限收藏",
      "语速调节、单句循环",
    ],
  },
  {
    level: "YEARLY",
    name: "年度会员",
    price: 168,
    days: 365,
    months: 12,
    desc: "365天终极会员权益，超值优待，一年无忧",
    planKey: "YEARLY",
    features: [
      "365天至尊全权",
      "双语动态字幕",
      "专属播客畅听",
      "音频、文稿下载",
      "语音跟读评测",
      "生词无限收藏",
      "语速调节、单句循环",
    ],
  },
];

const DEFAULT_PLAN_IDS: Record<string, string> = {
  WEEKLY: "2a5a71d0621611f1aea252540025c377",
  MONTHLY: "83afbe20380e11f1917552540025c377",
  QUARTERLY: "882e1e46380f11f1a8b252540025c377",
  YEARLY: "f8a295b2380f11f1b24a52540025c377",
};

export function buildAfdianPaymentUrl(params: {
  planId: string;
  months: number;
  remark: string;
}): string {
  const searchParams = new URLSearchParams({
    plan_id: params.planId,
    product_type: "0",
    month: String(params.months),
    remark: params.remark,
  });
  return `https://ifdian.net/order/create?${searchParams.toString()}`;
}

export function getAfdianPlanId(planKey: string): string {
  try {
    const envMap: Record<string, string | undefined> = {
      WEEKLY: process.env.NEXT_PUBLIC_AFDIAN_PLAN_ID_WEEKLY,
      MONTHLY: process.env.NEXT_PUBLIC_AFDIAN_PLAN_ID_MONTHLY,
      QUARTERLY: process.env.NEXT_PUBLIC_AFDIAN_PLAN_ID_QUARTERLY,
      YEARLY: process.env.NEXT_PUBLIC_AFDIAN_PLAN_ID_YEARLY,
    };
    if (envMap[planKey]) return envMap[planKey]!;
  } catch (err) {
    console.warn("Failed to read env map", err);
  }
  return DEFAULT_PLAN_IDS[planKey] || "";
}

interface SubscribeClientProps {
  user: {
    email: string;
    role: string;
    isPremium: boolean;
    expiryDate: string | null;
  } | null;
}

export function SubscribeClient({ user }: SubscribeClientProps) {
  const [copied, setCopied] = useState(false);
  const [isVipFreshActive, setIsVipFreshActive] = useState(false);
  const [flashMessage, setFlashMessage] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const { update: updateSession } = useSession();
  const router = useRouter();

  // 轮询后端接口，当检测到会员激活或续费时显示动画横幅
  useEffect(() => {
    if (user && isPolling) {
      // 设定 5 分钟超时时间，超过后自动停止轮询以节省资源
      const timeout = setTimeout(() => setIsPolling(false), 300000);

      const interval = setInterval(async () => {
        try {
          const res = await fetch("/api/user/subscription/status");
          if (res.ok) {
            const data = await res.json();

            let activated = false;
            let message = "";

            // 1. 初次激活：原非 PREMIUM，现变为 PREMIUM 或 ADMIN
            if (
              !user.isPremium &&
              (data.role === "PREMIUM" || data.role === "ADMIN")
            ) {
              activated = true;
              message =
                "【系统恭喜】您的付款已被爱发电成功捕获！会员资格已秒级自动充值并生效激活！";
            }
            // 2. 续费延长：已经是 PREMIUM，且到期时间发生变化
            else if (
              user.isPremium &&
              data.expiryDate &&
              data.expiryDate !== user.expiryDate
            ) {
              activated = true;
              message = `【系统恭喜】您的付款已被爱发电成功捕获！会员资格已延长至${data.expiryDate}！`;
            }

            if (activated) {
              setFlashMessage(message);
              setIsVipFreshActive(true);
              setTimeout(() => setIsVipFreshActive(false), 5000);
              setIsPolling(false);

              // Update the NextAuth session token with the new role
              // so that useSession() across all components reflects PREMIUM
              await updateSession({ user: { role: data.role } });

              router.refresh(); // Refresh Server Components for latest data
              clearInterval(interval);
              clearTimeout(timeout);
            }
          }
        } catch (e) {
          console.error("Failed to poll subscription stats:", e);
        }
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [user, isPolling, router, updateSession]);

  const handleCopyEmail = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "WEEKLY":
        return { text: "7 天", color: "bg-slate-100 text-slate-500" };
      case "MONTHLY":
        return {
          text: "30 天",
          color: "bg-orange-200 text-orange-700 font-bold",
        };
      case "QUARTERLY":
        return { text: "90 天", color: "bg-slate-100 text-slate-500" };
      case "YEARLY":
        return { text: "365 天", color: "bg-slate-100 text-slate-500" };
      default:
        return { text: "免费", color: "bg-slate-100 text-slate-500" };
    }
  };

  return (
    <>
      {/* 📢 VIP Activation Flash Banner */}
      <AnimatePresence>
        {isVipFreshActive && (
          <motion.div
            id="vipv-fresh-banner"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-orange-500 text-white py-3.5 px-4 shadow-lg text-center font-bold text-xs sm:text-sm flex items-center justify-center gap-2 relative z-50"
          >
            <Sparkles className="w-4 h-4 text-yellow-300 animate-bounce" />
            <span>{flashMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        id="plans-grid-root"
        className="space-y-10 max-w-6xl mx-auto px-4 py-12"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">赞助方案</h1>
          <p className="text-base-content/60 text-lg max-w-2xl mx-auto">
            解锁全部播客学习功能，体验无限制的沉浸式学习。
          </p>

          {user?.isPremium && (
            <div className="mt-4 inline-flex items-center gap-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold px-3 py-0.5 rounded-full">
              <Crown className="w-3.5 h-3.5 fill-orange-400" />
              {user.role === "ADMIN"
                ? "您是系统管理员（永久高级权限）"
                : user.expiryDate
                  ? `您的高级会员有效期至：${user.expiryDate}`
                  : "您的高级会员已激活（长期有效）"}
            </div>
          )}
        </div>

        {/* Email copy banner */}
        {user ? (
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-center gap-6 border border-slate-800">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs bg-orange-65 bg-orange-600/30 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 mb-2">
                <UserCheck className="w-3.5 h-3.5" />
                当前已登录用户身份
              </span>
              <h4 className="text-lg font-bold font-sans">
                充值激活邮箱：
                <span className="text-yellow-400 font-mono underline">
                  {user.email}
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                通过{" "}
                <span className="text-orange-400 font-bold italic">爱发电</span>{" "}
                无缝激活您的{" "}
                <span className="text-orange-400 font-bold italic">
                  {" "}
                  远路播客{" "}
                </span>{" "}
                会员资格。选择合适您的方案后，系统将自动在爱发电支付留言中预填您的邮箱，实现秒级自动激活！
              </p>
            </div>
            <button
              onClick={handleCopyEmail}
              className="flex-shrink-0 bg-white hover:bg-slate-100 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow cursor-pointer"
            >
              <ClipboardCopy className="w-4 h-4 text-slate-700" />
              {copied ? "已复制到剪贴板！" : "复制当前激活邮箱"}
            </button>
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-orange-950 space-y-1">
              <h4 className="font-bold text-sm flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-orange-600" />
                未检测到用户登录信息
              </h4>
              <p className="text-xs text-orange-900/85">
                目前您还是游客状态。在爱发电充值时必须填写您注册在远路播客站点的对应邮箱，否则无法进行自动匹配激活。
              </p>
            </div>
            <button
              onClick={() => router.push("/auth/login")}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl h-fit transition active:scale-95 shadow cursor-pointer"
            >
              立即登录/注册账号
            </button>
          </div>
        )}

        {/* Plans Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {AFDIAN_PLANS.map((plan) => {
            const badge = getLevelBadge(plan.level);
            const isMonthly = plan.level === "MONTHLY";
            const planId = getAfdianPlanId(plan.planKey);
            const remark = user ? user.email : "";
            const paymentUrl =
              planId && user
                ? buildAfdianPaymentUrl({ planId, months: plan.months, remark })
                : null;

            return (
              <div
                key={plan.level}
                className={`rounded-2xl p-6 flex flex-col relative transition-all duration-300 group justify-between ${
                  isMonthly
                    ? "bg-orange-50 border-2 border-orange-500 shadow-sm"
                    : "bg-white border border-slate-200 hover:border-orange-200 shadow-sm"
                }`}
              >
                {isMonthly && (
                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    MOST POPULAR
                  </div>
                )}

                <div className="space-y-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <span
                        className={`px-2 py-1 text-[10px] font-bold rounded ${badge.color}`}
                      >
                        {badge.text}
                      </span>
                      <div className="text-2xl font-black text-slate-900">
                        ¥{plan.price}
                      </div>
                    </div>

                    <h4 className="text-xl font-bold mb-2 text-slate-900">
                      {plan.name}
                    </h4>
                    <ul className="text-sm text-slate-500 space-y-2 mb-auto">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-orange-500">•</span> {feat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 mt-6 border-t border-slate-100">
                    {!user ? (
                      <button
                        onClick={() => router.push("/auth/login")}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                          isMonthly
                            ? "bg-orange-500 text-white hover:bg-orange-600"
                            : "bg-slate-100 text-slate-800 hover:bg-orange-500 hover:text-white"
                        }`}
                      >
                        登录后订阅
                      </button>
                    ) : !planId ? (
                      <div className="flex items-center justify-center gap-1 text-amber-600 text-xs py-3">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        请先配置 Plan ID
                      </div>
                    ) : (
                      <a
                        href={paymentUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsPolling(true)}
                        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                          isMonthly
                            ? "bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-200"
                            : "bg-slate-100 text-slate-800 hover:bg-orange-500 hover:text-white"
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        一键订阅
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {user && planId && (
                      <p className="text-[10px] text-slate-400 text-center mt-2">
                        点击跳转至爱发电完成支付，留言已预填{" "}
                        <code className="text-orange-500">{user.email}</code>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
