"use client";

import React, { useState } from "react";
import { LifeBuoy, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

/**
 * [P2-3] 支付自助找回入口（订阅页底部）：
 * 支付留言 UID 被改动/删除导致无法自动激活时，用户凭爱发电订单号
 * 自助认领；无法自动归属时转人工找回申请。
 */
export default function PaymentRecovery({
  onRecovered,
}: {
  /** 找回成功后的统一收尾（闪示消息 + 刷新会话），复用 P2-2 激活链路 */
  onRecovered: (message: string) => Promise<void> | void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [outTradeNo, setOutTradeNo] = useState("");
  const [amount, setAmount] = useState("");
  const [amountRequired, setAmountRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const tradeNo = outTradeNo.trim();
    if (!tradeNo) {
      toast.error("请先输入爱发电订单号");
      return;
    }
    if (amountRequired && !amount.trim()) {
      toast.error("请补充该笔订单的准确支付金额（爱发电记录中可查）");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/subscription/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outTradeNo: tradeNo,
          amount: amount.trim() ? Number(amount) : undefined,
        }),
      });
      const data = await res.json();

      if (res.ok && data.code === "ACTIVATED") {
        const expiry = new Date(data.newExpiry).toLocaleDateString("zh-CN");
        toast.success(
          `已找回付款并激活 ${data.daysAdded} 天会员！有效期至 ${expiry}`,
        );
        setOutTradeNo("");
        setAmount("");
        setAmountRequired(false);
        setExpanded(false);
        await onRecovered(
          `【找回成功】您的付款已找回，会员资格已${data.isRenewal ? "延长" : "激活"}至${expiry}！`,
        );
        return;
      }
      if (data.code === "ALREADY_ACTIVATED") {
        toast.info(data.message);
        return;
      }
      if (data.code === "PROOF_REQUIRED" || data.needAmount) {
        setAmountRequired(true);
      }
      toast.error(data.error || "找回失败，请稍后重试");
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="mx-auto flex items-center gap-1.5 text-xs font-bold text-ink-400 hover:text-accent-500 transition cursor-pointer"
        >
          <LifeBuoy className="w-3.5 h-3.5" />
          支付完成但会员未到账？自助找回付款
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-5 shadow-sm max-w-xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <LifeBuoy className="w-5 h-5 text-accent-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-ink-900 dark:text-ink-100">
                  自助找回付款
                </h4>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-1 leading-relaxed">
                  若支付时留言中的 UID 被改动或删除，会员将无法自动激活。
                  凭爱发电订单号即可自助找回：
                  <span className="text-ink-400">
                    {" "}
                    爱发电 → 我的 → 记录 → 订单详情 → 商户订单号
                  </span>
                  。
                </p>
              </div>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 transition cursor-pointer shrink-0"
              aria-label="收起"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              className="w-full bg-ink-50 dark:bg-ink-950 border border-ink-200 dark:border-ink-800 rounded-xl px-3.5 py-2.5 text-sm font-mono placeholder:font-sans focus:outline-none focus:border-accent-400 transition"
              placeholder="爱发电商户订单号（一长串字母数字）"
              value={outTradeNo}
              onChange={(e) => setOutTradeNo(e.target.value)}
              disabled={submitting}
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="number"
                min="0"
                step="0.01"
                className="grow bg-ink-50 dark:bg-ink-950 border border-ink-200 dark:border-ink-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent-400 transition"
                placeholder={
                  amountRequired
                    ? "支付金额（元）· 本单必填"
                    : "支付金额（元）· 订单无留言时需填写"
                }
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
              />
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="shrink-0 bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition active:scale-95 shadow cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LifeBuoy className="w-4 h-4" />
                )}
                {submitting ? "找回中…" : "找回我的会员"}
              </button>
            </div>
            <p className="text-[10px] text-ink-400 leading-relaxed">
              系统将核对订单留言与您的账号标识；无法自动匹配时需补充准确支付金额，
              仍失败将自动登记人工找回申请，管理员核对后会尽快为您处理。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
