"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, Inbox, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import clsx from "clsx";

interface OrderUser {
  userid: string;
  nickname: string | null;
  email: string;
  phone: string | null;
}

interface WxpayOrderRow {
  orderid: number;
  outTradeNo: string;
  wxOrderId: string | null;
  status: string;
  statusLabel: string;
  planKey: string;
  planName: string;
  productId: string;
  buyQuantity: number;
  amountFen: number;
  daysGranted: number;
  createAt: string;
  updateAt: string;
  user: OrderUser | null;
}

interface Stats {
  [status: string]: { count: number; amountFen: number };
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-ghost",
  ACTIVATED: "badge-success",
  AMOUNT_MISMATCH: "badge-warning",
  REFUNDED: "badge-error",
  CLOSED: "badge-ghost",
};

function fenToYuan(fen: number) {
  return (fen / 100).toFixed(2);
}

function userLabel(u: OrderUser | null) {
  if (!u) return "未知用户";
  const name = u.nickname || u.email.split("@")[0];
  return `${name}（${u.email}）`;
}

export default function OrdersClient() {
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<WxpayOrderRow[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/wxpay/orders?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
      setStats(data.stats ?? {});
      setStatusLabels(data.statusLabels ?? {});
    } catch (e) {
      toast.error(
        e instanceof Error ? `订单加载失败：${e.message}` : "订单加载失败",
      );
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    load();
  }, [load]);

  const tabs = ["", ...Object.keys(statusLabels)];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">微信虚拟支付订单</h1>
        <button
          className="btn btn-sm btn-ghost"
          onClick={load}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          刷新
        </button>
      </div>

      {/* 状态机汇总卡 */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((s) => {
          const st = stats[s];
          const label = s ? (statusLabels[s] ?? s) : "全部";
          const info = s
            ? `${st?.count ?? 0} 笔 / ¥${fenToYuan(st?.amountFen ?? 0)}`
            : `${Object.values(stats).reduce((n, x) => n + x.count, 0)} 笔`;
          return (
            <button
              key={s || "ALL"}
              className={clsx(
                "btn btn-sm",
                status === s ? "btn-primary" : "btn-outline",
              )}
              onClick={() => setStatus(s)}
            >
              {label}（{info}）
            </button>
          );
        })}
      </div>

      {/* 搜索 */}
      <div className="join">
        <span className="join-item bg-base-200 flex items-center px-3">
          <Search className="w-4 h-4 opacity-50" />
        </span>
        <input
          className="input input-bordered join-item flex-1"
          placeholder="搜索单号 / 微信单号 / 道具 ID / 用户邮箱"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="btn join-item" onClick={load}>
          搜索
        </button>
      </div>

      {/* 订单表 */}
      <div className="overflow-x-auto rounded-xl bg-base-100 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-base-content/60 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> 加载中…
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-base-content/60 gap-2">
            <Inbox className="w-8 h-8 opacity-40" />
            <span className="text-sm">暂无（此类）订单</span>
          </div>
        ) : (
          <table className="table table-sm md:table-md">
            <thead>
              <tr>
                <th>商户单号 / 微信单号</th>
                <th>用户</th>
                <th>档位 / 道具</th>
                <th>金额</th>
                <th>天数</th>
                <th>状态</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.orderid} className="hover:bg-base-200/40">
                  <td className="font-mono text-xs">
                    <div>{o.outTradeNo}</div>
                    {o.wxOrderId && (
                      <div className="opacity-60">{o.wxOrderId}</div>
                    )}
                  </td>
                  <td
                    className="text-xs max-w-48 truncate"
                    title={userLabel(o.user)}
                  >
                    {userLabel(o.user)}
                  </td>
                  <td className="text-xs">
                    {o.planName} ×{o.buyQuantity}
                    <div className="opacity-60 font-mono">{o.productId}</div>
                  </td>
                  <td className="font-bold">¥{fenToYuan(o.amountFen)}</td>
                  <td>{o.daysGranted > 0 ? `+${o.daysGranted}` : "—"}</td>
                  <td>
                    <span
                      className={clsx(
                        "badge badge-sm",
                        STATUS_BADGE[o.status] ?? "badge-ghost",
                      )}
                    >
                      {o.statusLabel}
                    </span>
                  </td>
                  <td className="text-xs opacity-70">
                    {format(new Date(o.createAt), "MM-dd HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs opacity-50">
        月支付限额与账单核对走 MP
        后台【支付与交易-虚拟支付】人工口径；对账不符订单需人工核实后处理。
      </p>
    </div>
  );
}
