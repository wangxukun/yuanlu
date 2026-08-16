import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { NextResponse } from "next/server";

// Valid user roles in the system
const VALID_ROLES = ["USER", "ADMIN", "PREMIUM"] as const;
type UserRole = (typeof VALID_ROLES)[number];

/**
 * AuthGuardResult - Returned by guard functions for API routes.
 * On success, contains the authenticated session.
 * On failure, contains a NextResponse ready to be returned.
 */
export type AuthGuardResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

/**
 * Require an authenticated user session.
 * Returns 401 if not authenticated.
 */
export async function requireAuth(): Promise<AuthGuardResult> {
  const session = await auth();

  if (!session?.user?.userid) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "请先登录" },
        { status: 401 },
      ),
    };
  }

  return { ok: true, session };
}

/**
 * Require the user to have ADMIN role.
 * Returns 401 if not authenticated, 403 if not an admin.
 */
export async function requireAdmin(): Promise<AuthGuardResult> {
  const result = await requireAuth();
  if (!result.ok) return result;

  if (result.session.user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "权限不足，需要管理员权限" },
        { status: 403 },
      ),
    };
  }

  return result;
}

/**
 * Check if a user has an active PREMIUM subscription in the database.
 * This enables "subscription-based" premium access independent of the static role field.
 */
async function hasActivePremiumSubscription(userid: string): Promise<boolean> {
  const activeSubscription = await prisma.subscriptions.findFirst({
    where: {
      userid,
      subscriptionType: "PREMIUM",
      endDate: { gt: new Date() },
    },
    select: { subscriptionid: true },
  });
  return activeSubscription !== null;
}

/**
 * Check if a user has PREMIUM or ADMIN role (including active subscription).
 */
export async function isPremiumUser(
  user?: { role?: string | null; userid?: string } | null,
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "PREMIUM" || user.role === "ADMIN") return true;
  if (user.userid && (await hasActivePremiumSubscription(user.userid)))
    return true;
  return false;
}

/**
 * 会员专享剧集墙的唯一服务端入口。
 * 校验用户能否访问（播放/下载/练习）指定剧集：
 * 非专享剧集人人可访问；专享剧集需会员资格（静态 role 或有效订阅任一命中）。
 *
 * 各路由（episode/detail 的字段剥离、episode/audio-proxy 的 403、
 * speech/practice-data 与 speech/errors 的拦截）统一调用本函数，
 * 避免专享判断逻辑散落导致各处鉴权口径不一致。
 * 当前站点处于内容全免费阶段（无剧集标记专享），本函数恒返回 true；
 * 未来上线专享剧集后自动生效，无需改动调用方。
 */
export async function canAccessEpisode(
  user?: { role?: string | null; userid?: string } | null,
  episode?: { isExclusive?: boolean | null } | null,
): Promise<boolean> {
  if (!episode?.isExclusive) return true;
  return isPremiumUser(user);
}

/**
 * Require the user to have PREMIUM or ADMIN role.
 * Uses a hybrid check: static role field OR active subscription in the database.
 * Returns 401 if not authenticated, 403 if not premium/admin.
 */
export async function requirePremium(): Promise<AuthGuardResult> {
  const result = await requireAuth();
  if (!result.ok) return result;

  const hasPremium = await isPremiumUser(result.session.user);
  if (hasPremium) {
    return result;
  }

  return {
    ok: false,
    response: NextResponse.json(
      { success: false, error: "权限不足，需要高级会员权限" },
      { status: 403 },
    ),
  };
}

/**
 * Validate that a role string is a valid UserRole.
 * Prevents injection of invalid role values (e.g., via API calls).
 */
export function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

// ─── Server Action Guards ────────────────────────────────────────────────────
// These variants throw errors instead of returning NextResponse,
// making them suitable for use in Server Actions.

/**
 * Require an authenticated session in Server Actions.
 * Throws an error if not authenticated.
 */
export async function requireAuthAction(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.userid) {
    throw new Error("Unauthorized: 请先登录");
  }
  return session;
}

/**
 * Require ADMIN role in Server Actions.
 * Throws an error if not authenticated or not an admin.
 */
export async function requireAdminAction(): Promise<Session> {
  const session = await requireAuthAction();
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden: 权限不足，需要管理员权限");
  }
  return session;
}

/**
 * Require PREMIUM or ADMIN role in Server Actions.
 * Uses a hybrid check: static role field OR active subscription in the database.
 * Throws an error if not authenticated or not premium/admin.
 */
export async function requirePremiumAction(): Promise<Session> {
  const session = await requireAuthAction();

  const hasPremium = await isPremiumUser(session.user);
  if (hasPremium) {
    return session;
  }

  throw new Error("Forbidden: 权限不足，需要高级会员权限");
}
