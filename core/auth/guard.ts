import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  verifyMobileToken,
  MobileTokenVerifyResult,
} from "@/core/auth/mobile-token.service";
import { generateSignatureUrl } from "@/lib/oss";
import { deriveDisplayRole } from "@/lib/premium-role";

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
 * Attempt to authenticate via mobile Bearer token.
 * Reads the Authorization header and verifies the JWT.
 * Returns a Session-like object on success, or null on failure.
 */
async function getMobileSession(): Promise<Session | null> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    const payload: MobileTokenVerifyResult | null =
      await verifyMobileToken(token);
    if (!payload) return null;

    // Check if user is still allowed to login (may have been banned)
    const userInDb = await prisma.user.findUnique({
      where: { userid: payload.userid },
      select: {
        isLoginAllowed: true,
        role: true,
        // [修复] 取当前真实值而非硬编码 0：移动端 JWT 不携带 sessionVersion 声明，
        // 硬编码 0 会让 update-activity 的"踢人比对"（DB值 !== session值）对
        // 曾被踢下线/禁登过的老用户恒 401，且重新登录也无法自愈——时长上报
        // 因此永不累计。填入 DB 当前值后与其他 requireAuth 接口口径一致：
        // 禁登仍由上方 isLoginAllowed 拦截，"踢下线"不再误伤移动端心跳。
        sessionVersion: true,
        // [P1-2] 附带最新订阅到期时间：移动端没有 Web 端的 5 分钟会话同步，
        // DB 的 role 缓存对纯移动用户可能滞后（如刚付费/刚过期），
        // 故在此按订阅事实实时派生展示角色，与 Web 端口径一致
        subscriptions: {
          where: { subscriptionType: "PREMIUM" },
          orderBy: { endDate: "desc" },
          take: 1,
          select: { endDate: true },
        },
        user_profile: {
          select: { avatarFileName: true, avatarUrl: true, nickname: true },
        },
      },
    });

    if (!userInDb || userInDb.isLoginAllowed === false) return null;

    // Generate avatar URL if available
    let avatarUrl: string | null = null;
    if (userInDb.user_profile?.avatarFileName) {
      try {
        avatarUrl = await generateSignatureUrl(
          userInDb.user_profile.avatarFileName,
          3600 * 3,
        );
      } catch {
        avatarUrl = userInDb.user_profile.avatarUrl || null;
      }
    }

    // Construct a Session object compatible with the existing auth() result
    return {
      user: {
        userid: payload.userid,
        email: payload.email,
        phone: payload.phone,
        // [P1-2] 展示角色按订阅事实派生，不直接用 DB 缓存值（口径同 auth.ts 会话同步）
        role: deriveDisplayRole(
          userInDb.role,
          userInDb.subscriptions?.[0]?.endDate ?? null,
        ),
        nickname: userInDb.user_profile?.nickname || payload.nickname,
        avatarUrl,
        emailVerified: null,
        phoneVerified: !!payload.phone,
        sessionVersion: userInDb.sessionVersion ?? 0,
      },
      expires: new Date(payload.exp * 1000).toISOString(),
    } as Session;
  } catch {
    return null;
  }
}

/**
 * Best-effort session: cookie auth (NextAuth) first, then mobile Bearer token.
 * Returns null when neither succeeds — for endpoints that allow anonymous
 * access but want the session when present (e.g. /api/dict quota tiers).
 */
export async function authWithMobile(): Promise<Session | null> {
  const session = await auth();
  if (session?.user?.userid) return session;
  return await getMobileSession();
}

/**
 * Require an authenticated user session.
 * First tries cookie-based auth (NextAuth), then falls back to mobile Bearer token.
 * Returns 401 if neither succeeds.
 */
export async function requireAuth(): Promise<AuthGuardResult> {
  // 1. Try cookie-based auth (Web clients)
  const session = await auth();
  if (session?.user?.userid) {
    return { ok: true, session };
  }

  // 2. Fallback: try mobile Bearer token
  const mobileSession = await getMobileSession();
  if (mobileSession?.user?.userid) {
    return { ok: true, session: mobileSession };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { success: false, error: "请先登录" },
      { status: 401 },
    ),
  };
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
 * 会员资格的唯一执行口径：ADMIN 直通，其余只认"有效订阅"（endDate > now）。
 * role="PREMIUM" 不参与判定——它已退化为展示标签（由 auth.ts 的会话同步
 * 从订阅状态派生回写）。若在此对 role 短路放行，"一次付费、终身会员"
 * 的收入级 Bug 会立即复现（P0-1）。
 */
export async function isPremiumUser(
  user?: { role?: string | null; userid?: string } | null,
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.userid && (await hasActivePremiumSubscription(user.userid)))
    return true;
  return false;
}

/**
 * 会员专享剧集墙的唯一服务端入口。
 * 校验用户能否访问（播放/下载/练习）指定剧集：
 * 非专享剧集人人可访问；专享剧集需会员资格（ADMIN 或有效订阅，见 isPremiumUser）。
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
 * 会员专享剧集对无权限用户可暴露的媒体字段集合。
 * 这些字段在 canAccessEpisode 不通过时必须清空（isExclusive 保留——
 * 前端锁图标/置灰态依赖它渲染）。
 */
const EXCLUSIVE_MEDIA_FIELDS = [
  "audioUrl",
  "audioFileName",
  "subtitleEnUrl",
  "subtitleEnFileName",
  "subtitleZhUrl",
  "subtitleZhFileName",
  "subtitleBilingualUrl",
  "subtitleBilingualFileName",
] as const;

/**
 * [P1-4] 剥离单条剧集的媒体字段（原地修改）。
 * 所有剧集数据出口（detail / list / [episodeid] / episodeService 列表）
 * 统一调用本函数，杜绝 OSS 直链与文件名绕过专享墙。
 * 调用方须先用 canAccessEpisode 判定无权限后再剥离。
 */
export function stripExclusiveEpisodeMedia<
  T extends { isExclusive?: boolean | null } & Record<string, unknown>,
>(episode: T): T {
  const writable = episode as Record<string, unknown>;
  for (const field of EXCLUSIVE_MEDIA_FIELDS) {
    if (writable[field] !== undefined) writable[field] = "";
  }
  return episode;
}

/**
 * [P1-4] 列表场景的批量剥离：仅当列表中存在专享剧集时才做一次会员判定
 * （非专享列表零开销），无权限用户的所有专享项媒体字段清空、元信息保留。
 */
export async function stripExclusiveMediaForEpisodeList<
  T extends { isExclusive?: boolean | null } & Record<string, unknown>,
>(
  episodes: T[],
  user?: { role?: string | null; userid?: string } | null,
): Promise<T[]> {
  if (!episodes.some((ep) => ep?.isExclusive)) return episodes;
  const allowed = await isPremiumUser(user);
  if (allowed) return episodes;
  for (const ep of episodes) {
    if (ep?.isExclusive) stripExclusiveEpisodeMedia(ep);
  }
  return episodes;
}

/**
 * Require the user to have premium access (ADMIN or active subscription).
 * Enforcement follows isPremiumUser — the PREMIUM role label alone never grants access.
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
  // Try cookie-based auth first
  const session = await auth();
  if (session?.user?.userid) {
    return session;
  }

  // Fallback: try mobile Bearer token
  const mobileSession = await getMobileSession();
  if (mobileSession?.user?.userid) {
    return mobileSession;
  }

  throw new Error("Unauthorized: 请先登录");
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
 * Require premium access (ADMIN or active subscription) in Server Actions.
 * Enforcement follows isPremiumUser — the PREMIUM role label alone never grants access.
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
