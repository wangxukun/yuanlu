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
 * Require the user to have PREMIUM or ADMIN role.
 * Uses a hybrid check: static role field OR active subscription in the database.
 * Returns 401 if not authenticated, 403 if not premium/admin.
 */
export async function requirePremium(): Promise<AuthGuardResult> {
  const result = await requireAuth();
  if (!result.ok) return result;

  const { role, userid } = result.session.user;

  // Fast path: static role grants immediate access
  if (role === "PREMIUM" || role === "ADMIN") {
    return result;
  }

  // Slow path: dynamic subscription check
  if (userid && (await hasActivePremiumSubscription(userid))) {
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
  const { role, userid } = session.user;

  // Fast path: static role grants immediate access
  if (role === "PREMIUM" || role === "ADMIN") {
    return session;
  }

  // Slow path: dynamic subscription check
  if (userid && (await hasActivePremiumSubscription(userid))) {
    return session;
  }

  throw new Error("Forbidden: 权限不足，需要高级会员权限");
}
