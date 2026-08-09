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
} from "lucide-react";
import { useRouter } from "next/navigation";

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
    userid: string;
    phone: string | null;
    email: string;
    role: string;
    isPremium: boolean;
    expiryDate: string | null;
  } | null;
}

export function SubscribeClient({ user }: SubscribeClientProps) {
  const [copied, setCopied] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const { update: updateSession } = useSession();
  const router = useRouter();

  // Polling: detect subscription activation, persist flash message to
  // sessionStorage so the global SubscriptionFlashToast can display it
  // after the inevitable page redirect.
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
              // Persist the congratulations message to sessionStorage so the
              // global toast component can display it after page redirect.
              sessionStorage.setItem("subscription_flash_message", message);
              setIsPolling(false);

              // Update the NextAuth session token with the new role
              await updateSession({ user: { role: data.role } });

              router.refresh();
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

  const handleCopyUID = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.userid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "WEEKLY":
        return {
          text: "7 天",
          color: "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400",
        };
      case "MONTHLY":
        return {
          text: "30 天",
          color:
            "bg-accent-200 text-accent-700 font-bold dark:bg-accent-950/50 dark:text-accent-400",
        };
      case "QUARTERLY":
        return {
          text: "90 天",
          color: "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400",
        };
      case "YEARLY":
        return {
          text: "365 天",
          color: "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400",
        };
      default:
        return {
          text: "免费",
          color: "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400",
        };
    }
  };

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen text-ink-900 dark:text-ink-100 pb-24">
      <div
        id="plans-grid-root"
        className="space-y-10 max-w-6xl mx-auto px-4 py-12"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">赞助方案</h1>
          {/* <p className="text-base-content/60 text-lg max-w-2xl mx-auto">
            解锁全部播客学习功能，体验无限制的沉浸式学习。
          </p> */}

          {user?.isPremium && (
            <div className="mt-4 inline-flex items-center gap-1 bg-accent-500/20 text-accent-400 border border-accent-500/30 text-xs font-bold px-3 py-0.5 rounded-full">
              <Crown className="w-3.5 h-3.5 fill-accent-400" />
              {user.role === "ADMIN"
                ? "您是系统管理员（永久高级权限）"
                : user.expiryDate
                  ? `您的高级会员有效期至：${user.expiryDate}`
                  : "您的高级会员已激活（长期有效）"}
            </div>
          )}
        </div>

        {/* UID copy banner */}
        {user ? (
          <div className="bg-ink-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-center gap-6 border border-ink-800">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs bg-accent-65 bg-accent-600/30 text-accent-300 border border-accent-500/30 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 mb-2">
                <UserCheck className="w-3.5 h-3.5" />
                当前已登录用户身份
              </span>
              <h4 className="text-lg font-bold font-sans">
                账号专属 UID：
                <span className="text-accent-400 font-mono underline ml-2 text-sm break-all">
                  {user.userid}
                </span>
              </h4>
              <div className="mt-2 mb-3 space-y-1">
                {user.phone && (
                  <div className="text-sm font-medium text-ink-300">
                    当前绑定手机号：<span className="text-ink-100">{user.phone}</span>
                  </div>
                )}
                {user.email && !user.email.includes("placeholder") && (
                  <div className="text-sm font-medium text-ink-300">
                    当前绑定邮箱：<span className="text-ink-100">{user.email}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-ink-400 mt-3">
                通过{" "}
                <span className="text-accent-400 font-bold italic">爱发电</span>{" "}
                无缝激活您的{" "}
                <span className="text-accent-400 font-bold italic">
                  {" "}
                  远路播客会员{" "}
                </span>{" "}
                资格。选择合适您的方案后，系统将自动在爱发电支付留言中预填您的专属账号标识 (UID)，实现秒级自动激活！用户在支付时，需确保该留言信息未被篡改。
                <span className="text-accent-400 font-bold italic">
                  该 UID 将作为系统精确匹配并自动激活会员资格的唯一核心凭证
                </span>
                。会员有效期自支付成功之时起算。若用户在现有会员有效期内再次购买任何订阅方案，新的有效期将在当前剩余时间基础上进行对应天数的累加。
              </p>
            </div>
            <button
              onClick={handleCopyUID}
              className="flex-shrink-0 bg-white hover:bg-ink-100 text-ink-950 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow cursor-pointer"
            >
              <ClipboardCopy className="w-4 h-4 text-ink-700" />
              {copied ? "已复制到剪贴板！" : "复制专属 UID"}
            </button>
          </div>
        ) : (
          <div className="bg-accent-50 dark:bg-accent-950/20 border border-accent-200 dark:border-accent-900/30 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-accent-950 dark:text-accent-200 space-y-1">
              <h4 className="font-bold text-sm flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                未检测到用户登录信息
              </h4>
              <p className="text-xs text-accent-900/85 dark:text-accent-300/80">
                目前您还是游客状态。在爱发电充值时系统需要将您的 UID（用户标识）作为留言填入，请先登录/注册以便正常使用自动充值功能。
              </p>
            </div>
            <button
              onClick={() => {
                (
                  document.getElementById(
                    "email_check_modal_box",
                  ) as HTMLDialogElement
                )?.showModal();
              }}
              className="bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs px-4 py-2 rounded-xl h-fit transition active:scale-95 shadow cursor-pointer"
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
            const remark = user ? user.userid : "";
            const paymentUrl =
              planId && user
                ? buildAfdianPaymentUrl({ planId, months: plan.months, remark })
                : null;

            return (
              <div
                key={plan.level}
                className={`rounded-2xl p-6 flex flex-col relative transition-all duration-300 group justify-between ${
                  isMonthly
                    ? "bg-accent-50 dark:bg-accent-950/10 border-2 border-accent-500 shadow-sm"
                    : "bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 hover:border-accent-200 dark:hover:border-accent-900/50 shadow-sm"
                }`}
              >
                {isMonthly && (
                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-accent-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
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
                      <div className="text-2xl font-black text-ink-900 dark:text-white">
                        ¥{plan.price}
                      </div>
                    </div>

                    <h4 className="text-xl font-bold mb-2 text-ink-900 dark:text-white">
                      {plan.name}
                    </h4>
                    <ul className="text-sm text-ink-500 dark:text-ink-400 space-y-2 mb-auto">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-accent-500">•</span> {feat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 mt-6 border-t border-ink-100 dark:border-ink-800">
                    {!user ? (
                      <button
                        onClick={() => router.push("/auth/login")}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                          isMonthly
                            ? "bg-accent-500 text-white hover:bg-accent-600"
                            : "bg-ink-100 dark:bg-ink-800 text-ink-800 dark:text-ink-200 hover:bg-accent-500 dark:hover:bg-accent-500 hover:text-white dark:hover:text-white"
                        }`}
                      >
                        登录后订阅
                      </button>
                    ) : !planId ? (
                      <div className="flex items-center justify-center gap-1 text-accent-600 text-xs py-3">
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
                            ? "bg-accent-500 text-white hover:bg-accent-600 shadow-md shadow-accent-200 dark:shadow-none"
                            : "bg-ink-100 dark:bg-ink-800 text-ink-800 dark:text-ink-200 hover:bg-accent-500 dark:hover:bg-accent-500 hover:text-white dark:hover:text-white"
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        一键订阅
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {user && planId && (
                      <p className="text-[10px] text-ink-400 text-center mt-2 break-all px-2">
                        点击跳转至爱发电完成支付，留言已预填专属 UID{" "}
                        <code className="text-accent-500 bg-accent-50 dark:bg-accent-950/30 px-1 py-0.5 rounded">{user.userid}</code>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex items-center justify-center">
          <p className="text-[10px] text-base-content opacity-60 font-bold tracking-wider">
            订阅即代表您知晓并接受
            <a
              href="/auth/subscription-agreement"
              target="_blank"
              className="link link-secondary link-hover mx-1"
            >
              《会员订阅服务协议》
            </a>
            ，感谢您的善意支持。
          </p>
        </div>
      </div>
    </div>
  );
}
