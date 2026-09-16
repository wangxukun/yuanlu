/**
 * 支付回流与激活检测的客户端单一数据源（P2-2，报告 F5）。
 *
 * 职责：
 *  1. 待确认支付的 localStorage 记录（跨页签/跨会话存活）：
 *     点击支付时写入基线快照（role + 原始到期时间戳），任意页面回站时
 *     据此补查一次订阅状态，命中激活即补播祝贺——付费后关掉页签也能看到反馈；
 *  2. 激活判定（detectActivation）：订阅页轮询、手动刷新、回流补查三处共用。
 *     续费判定用原始时间戳比较（ISO expiryAt），不再比对格式化中文日期串，
 *     消除同日续费/格式变化的边界漏判（F5-3）。
 */

export interface SubscriptionSnapshot {
  role: string;
  /** 原始到期时间（ISO 8601），激活判定的比较基准 */
  expiryAt: string | null;
  /** 格式化中文到期时间，仅用于展示，不参与判定 */
  expiryDate: string | null;
}

export interface ActivationBaseline {
  role: string;
  expiryAt: string | null;
}

export interface PendingPaymentRecord extends ActivationBaseline {
  userid: string;
  /** 点击支付的时刻（Date.now()），超期记录视为过期清理 */
  startedAt: number;
}

export const PENDING_PAYMENT_KEY = "yuanlu_pending_payment";

/** 回流补查窗口：超过则认为支付流程已终结，静默清理记录 */
export const PENDING_PAYMENT_TTL_MS = 72 * 60 * 60 * 1000;

function isPremiumRole(role: string): boolean {
  return role === "PREMIUM" || role === "ADMIN";
}

export function recordPendingPayment(
  userid: string,
  snapshot: ActivationBaseline & { expiryDate?: string | null },
): void {
  try {
    const record: PendingPaymentRecord = {
      userid,
      role: snapshot.role,
      expiryAt: snapshot.expiryAt,
      startedAt: Date.now(),
    };
    localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(record));
  } catch {
    // localStorage 不可用（隐私模式等）时静默降级：仅失去回流补查能力
  }
}

export function readPendingPayment(): PendingPaymentRecord | null {
  try {
    const raw = localStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingPaymentRecord>;
    if (
      typeof parsed.userid !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.startedAt !== "number" ||
      (parsed.expiryAt !== null && typeof parsed.expiryAt !== "string")
    ) {
      return null;
    }
    if (Date.now() - parsed.startedAt > PENDING_PAYMENT_TTL_MS) {
      clearPendingPayment();
      return null;
    }
    return parsed as PendingPaymentRecord;
  } catch {
    return null;
  }
}

export function clearPendingPayment(): void {
  try {
    localStorage.removeItem(PENDING_PAYMENT_KEY);
  } catch {
    // 同上，静默
  }
}

export async function fetchSubscriptionStatus(): Promise<SubscriptionSnapshot | null> {
  try {
    const res = await fetch("/api/user/subscription/status");
    if (!res.ok) return null;
    const data = (await res.json()) as {
      role?: string;
      expiryAt?: string | null;
      expiryDate?: string | null;
    };
    if (typeof data.role !== "string") return null;
    return {
      role: data.role,
      expiryAt: data.expiryAt ?? null,
      expiryDate: data.expiryDate ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * 比较基线与当前快照，判定是否发生了付费激活。
 * 返回祝贺文案；未激活返回 null。
 */
export function detectActivation(
  baseline: ActivationBaseline,
  current: SubscriptionSnapshot,
): { message: string } | null {
  // 1. 初次激活：原非会员，现变为 PREMIUM 或 ADMIN
  if (!isPremiumRole(baseline.role) && isPremiumRole(current.role)) {
    return {
      message:
        "【系统恭喜】您的付款已被爱发电成功捕获！会员资格已秒级自动充值并生效激活！",
    };
  }

  // 2. 续费延长：原本是会员，且原始到期时间戳后移（F5-3：时间戳比较，
  //    不再比对格式化日期字符串）
  if (
    isPremiumRole(baseline.role) &&
    baseline.expiryAt &&
    current.expiryAt &&
    Date.parse(current.expiryAt) > Date.parse(baseline.expiryAt)
  ) {
    const expiryText = current.expiryDate || current.expiryAt.slice(0, 10);
    return {
      message: `【系统恭喜】您的付款已被爱发电成功捕获！会员资格已延长至${expiryText}！`,
    };
  }

  return null;
}
