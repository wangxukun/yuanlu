"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  ClipboardCopy,
  UserCheck,
  BadgeCheck,
  BellRing,
  Inbox,
  History,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import clsx from "clsx";

interface UserInfo {
  userid: string;
  nickname: string | null;
  email: string;
  phone: string | null;
}

interface PendingOrder {
  orderid: number;
  outTradeNo: string;
  amount: number;
  planId: string | null;
  status: "NO_REMARK" | "UNMATCHED_USER";
  remark: string | null;
  createAt: string;
  claimRequestedAt: string | null;
  claimRequestedUser: UserInfo | null;
  planName: string | null;
  expectedDays: number;
  /** 白名单计费预判：AMOUNT_MISMATCH / NON_PLAN_SPONSOR 时认领无法加时 */
  grantStatus: "ACTIVATED" | "AMOUNT_MISMATCH" | "NON_PLAN_SPONSOR";
}

interface HistoryOrder {
  orderid: number;
  outTradeNo: string;
  amount: number;
  status: string;
  remark: string | null;
  createAt: string;
  daysGranted: number;
  claimedAt: string | null;
  targetUser: UserInfo | null;
  claimedByUser: UserInfo | null;
  selfService: boolean;
  planName: string | null;
}

interface ClaimRowState {
  query: string;
  results: UserInfo[];
  searching: boolean;
  selected: UserInfo | null;
  submitting: boolean;
}

const EMPTY_ROW: ClaimRowState = {
  query: "",
  results: [],
  searching: false,
  selected: null,
  submitting: false,
};

function userLabel(u: UserInfo | null): string {
  if (!u) return "未知用户";
  const name = u.nickname || u.email.split("@")[0];
  return `${name}（${u.email}）`;
}

export default function ClaimClient() {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
  const [rowState, setRowState] = useState<Record<number, ClaimRowState>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/afdian/orders?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        toast.error("加载订单失败，请确认管理员权限");
        return;
      }
      const data = await res.json();
      if (tab === "pending") {
        setPendingOrders(data.orders ?? []);
      } else {
        setHistoryOrders(data.orders ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const setRow = (orderid: number, patch: Partial<ClaimRowState>) => {
    setRowState((prev) => ({
      ...prev,
      [orderid]: { ...(prev[orderid] ?? EMPTY_ROW), ...patch },
    }));
  };

  const searchUsers = async (orderid: number) => {
    const row = rowState[orderid] ?? EMPTY_ROW;
    if (!row.query.trim()) {
      toast.error("请输入 UID / 邮箱 / 手机号");
      return;
    }
    setRow(orderid, { searching: true, results: [], selected: null });
    try {
      const res = await fetch(
        `/api/admin/afdian/orders?userSearch=${encodeURIComponent(row.query.trim())}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        toast.error("搜索用户失败");
        return;
      }
      const data = await res.json();
      setRow(orderid, {
        searching: false,
        results: data.users ?? [],
      });
      if ((data.users ?? []).length === 0) toast.info("未找到匹配用户");
    } catch {
      setRow(orderid, { searching: false });
      toast.error("搜索用户失败");
    }
  };

  const submitClaim = async (order: PendingOrder) => {
    const row = rowState[order.orderid] ?? EMPTY_ROW;
    if (!row.selected) {
      toast.error("请先搜索并选择要绑定的用户");
      return;
    }
    const grantWarning =
      order.grantStatus === "AMOUNT_MISMATCH"
        ? "注意：该订单金额非套餐单价整数倍，白名单计费将拒绝加时（仅归档绑定）。\n\n"
        : order.grantStatus === "NON_PLAN_SPONSOR"
          ? "注意：该订单无套餐凭据，认领只入账不加时。\n\n"
          : "";
    if (
      !window.confirm(
        `${grantWarning}确认为 ${userLabel(row.selected)} 认领订单 ${order.outTradeNo.slice(-8)}…（¥${order.amount}）并激活 ${order.expectedDays} 天会员？`,
      )
    ) {
      return;
    }
    setRow(order.orderid, { submitting: true });
    try {
      const res = await fetch("/api/admin/afdian/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderid,
          userid: row.selected.userid,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "认领失败");
        await load();
        return;
      }
      toast.success(
        `认领成功：已为 ${userLabel(row.selected)} 激活 ${data.daysAdded} 天，有效期至 ${format(new Date(data.newExpiry), "yyyy-MM-dd")}`,
      );
      setRowState((prev) => {
        const next = { ...prev };
        delete next[order.orderid];
        return next;
      });
      await load();
    } catch {
      toast.error("认领请求失败");
    } finally {
      setRow(order.orderid, { submitting: false });
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已复制");
  };

  return (
    <div className="space-y-6">
      {/* 标题区：说明与控件分行，避免长文本挤压控件行造成点击遮挡 */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BadgeCheck className="w-6 h-6 text-accent-500" />
            爱发电订单认领
          </h1>
          <p className="text-sm text-base-content/60 mt-1 max-w-3xl">
            支付留言缺失或无法匹配用户的订单会进入待认领池。绑定用户后激活走与
            Webhook 相同的事务（幂等账本 +
            套餐白名单计费），无套餐凭据或金额不符的订单无法加时。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="join">
            <button
              className={clsx(
                "btn join-item btn-sm",
                tab === "pending" && "btn-primary",
              )}
              onClick={() => setTab("pending")}
            >
              <Inbox className="w-4 h-4" />
              待认领
              {pendingOrders.length > 0 && (
                <span className="badge badge-error badge-sm text-white">
                  {pendingOrders.length}
                </span>
              )}
            </button>
            <button
              className={clsx(
                "btn join-item btn-sm",
                tab === "history" && "btn-primary",
              )}
              onClick={() => setTab("history")}
            >
              <History className="w-4 h-4" />
              认领历史
            </button>
          </div>
          <label className="input input-bordered input-sm flex items-center gap-2 sm:ml-auto">
            <Search className="w-4 h-4 opacity-50" />
            <input
              type="text"
              className="grow w-36"
              placeholder="订单号 / 留言"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void load()}
            />
          </label>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-base-content/50">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          加载中…
        </div>
      )}

      {!loading && tab === "pending" && (
        <div className="space-y-4">
          {pendingOrders.length === 0 && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body items-center py-12 text-base-content/50">
                <Inbox className="w-10 h-10 mb-2" />
                没有待认领订单——所有付款都已自动匹配或处理完毕 🎉
              </div>
            </div>
          )}
          {pendingOrders.map((order) => {
            const row = rowState[order.orderid] ?? EMPTY_ROW;
            return (
              <div
                key={order.orderid}
                className="card bg-base-100 shadow-sm border border-base-200"
              >
                <div className="card-body gap-4 p-5">
                  {/* 订单信息行 */}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span
                      className={clsx(
                        "badge badge-sm",
                        order.status === "NO_REMARK"
                          ? "badge-ghost"
                          : "badge-warning badge-outline",
                      )}
                    >
                      {order.status === "NO_REMARK" ? "无留言" : "留言未匹配"}
                    </span>
                    {order.grantStatus === "ACTIVATED" && order.planName && (
                      <span className="badge badge-sm badge-primary badge-outline">
                        {order.planName} · 应发 {order.expectedDays} 天
                      </span>
                    )}
                    {order.grantStatus === "AMOUNT_MISMATCH" && (
                      <span className="badge badge-sm badge-error badge-outline">
                        {order.planName ?? "套餐"} · 金额非单价整数倍（¥
                        {order.amount}）· 白名单计费拒绝加时
                      </span>
                    )}
                    {order.grantStatus === "NON_PLAN_SPONSOR" && (
                      <span className="badge badge-sm badge-error badge-outline">
                        无套餐凭据（自定义赞助）· 认领只入账不加时
                      </span>
                    )}
                    <span className="font-bold">¥{order.amount}</span>
                    <span className="text-base-content/50">
                      {format(new Date(order.createAt), "yyyy-MM-dd HH:mm")}
                    </span>
                    <button
                      className="btn btn-ghost btn-xs font-mono"
                      onClick={() => copyText(order.outTradeNo)}
                      title={order.outTradeNo}
                    >
                      …{order.outTradeNo.slice(-12)}
                      <ClipboardCopy className="w-3 h-3" />
                    </button>
                  </div>

                  {order.remark && (
                    <div className="text-sm bg-base-200/60 rounded-lg px-3 py-2 border-l-4 border-base-300">
                      <span className="text-base-content/50 mr-1">
                        支付留言：
                      </span>
                      {order.remark}
                    </div>
                  )}

                  {/* 自助找回申请标记 */}
                  {order.claimRequestedUser && (
                    <div className="flex items-start gap-2 text-sm bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-2">
                      <BellRing className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        用户已提交自助找回申请（
                        {format(
                          new Date(order.claimRequestedAt || order.createAt),
                          "MM-dd HH:mm",
                        )}
                        ）：{userLabel(order.claimRequestedUser)}
                        ——请与爱发电后台付款人信息核对后认领
                      </span>
                    </div>
                  )}

                  {/* 绑定与认领 */}
                  <div className="divider my-0" />
                  <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                    <div className="join flex grow">
                      <input
                        type="text"
                        className="input input-bordered input-sm join-item grow"
                        placeholder="搜索绑定用户：UID / 邮箱 / 手机号"
                        value={row.query}
                        onChange={(e) =>
                          setRow(order.orderid, { query: e.target.value })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && void searchUsers(order.orderid)
                        }
                        disabled={!!row.selected}
                      />
                      <button
                        className="btn join-item btn-sm"
                        onClick={() => void searchUsers(order.orderid)}
                        disabled={row.searching || !!row.selected}
                      >
                        {row.searching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        搜索
                      </button>
                    </div>

                    {row.selected && (
                      <div className="flex items-center gap-2">
                        <span className="badge badge-success gap-1 py-2 max-w-72">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span className="truncate">
                            {userLabel(row.selected)}
                          </span>
                        </span>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() =>
                            setRow(order.orderid, {
                              selected: null,
                              results: [],
                            })
                          }
                        >
                          重选
                        </button>
                      </div>
                    )}

                    <button
                      className="btn btn-primary btn-sm shrink-0"
                      disabled={!row.selected || row.submitting}
                      onClick={() => void submitClaim(order)}
                    >
                      {row.submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="w-4 h-4" />
                      )}
                      认领并激活
                    </button>
                  </div>

                  {row.results.length > 0 && !row.selected && (
                    <div className="flex flex-wrap gap-2">
                      {row.results.map((u) => (
                        <button
                          key={u.userid}
                          className="btn btn-outline btn-xs"
                          onClick={() => setRow(order.orderid, { selected: u })}
                        >
                          <UserCheck className="w-3 h-3" />
                          {userLabel(u)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && tab === "history" && (
        <div className="card bg-base-100 shadow-sm overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>认领时间</th>
                <th>订单号</th>
                <th>金额</th>
                <th>套餐</th>
                <th>加时</th>
                <th>目标用户</th>
                <th>方式</th>
                <th>操作人</th>
              </tr>
            </thead>
            <tbody>
              {historyOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-10 text-base-content/50"
                  >
                    暂无认领记录
                  </td>
                </tr>
              )}
              {historyOrders.map((o) => (
                <tr key={o.orderid}>
                  <td className="whitespace-nowrap">
                    {o.claimedAt
                      ? format(new Date(o.claimedAt), "MM-dd HH:mm")
                      : "—"}
                  </td>
                  <td className="font-mono text-xs" title={o.outTradeNo}>
                    …{o.outTradeNo.slice(-12)}
                  </td>
                  <td>¥{o.amount}</td>
                  <td>{o.planName ?? "—"}</td>
                  <td className="font-bold text-accent-500">
                    {o.daysGranted} 天
                  </td>
                  <td className="max-w-56 truncate" title={o.targetUser?.email}>
                    {userLabel(o.targetUser)}
                  </td>
                  <td>
                    {o.selfService ? (
                      <span className="badge badge-sm badge-info badge-outline">
                        自助找回
                      </span>
                    ) : (
                      <span className="badge badge-sm badge-secondary badge-outline">
                        管理员
                      </span>
                    )}
                  </td>
                  <td
                    className="max-w-48 truncate"
                    title={o.claimedByUser?.email}
                  >
                    {o.selfService ? (
                      "—"
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 opacity-50" />
                        {userLabel(o.claimedByUser)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
