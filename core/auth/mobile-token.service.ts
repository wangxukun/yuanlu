// core/auth/mobile-token.service.ts
// Mobile JWT Token service — sign and verify Bearer tokens for mobile clients.
// Uses the same NEXTAUTH_SECRET for signing, ensuring the token ecosystem is unified.

import { SignJWT, jwtVerify, JWTPayload } from "jose";

/**
 * Payload embedded in mobile JWT tokens.
 * Mirrors the key fields from NextAuth's session.user.
 */
export interface MobileTokenPayload {
  userid: string;
  email: string;
  phone: string | null;
  role: string;
  nickname: string | null;
  avatarFileName: string | null;
}

/**
 * Verified result returned by verifyMobileToken.
 */
export interface MobileTokenVerifyResult extends MobileTokenPayload {
  exp: number;
  iat: number;
}

// Token validity: 30 days (aligned with Web's NextAuth cookie maxAge)
const TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET is not configured. Cannot sign mobile tokens.",
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Sign a mobile JWT token for the given user payload.
 * Returns { token, expiresAt } where expiresAt is an ISO string.
 */
export async function signMobileToken(
  payload: MobileTokenPayload,
): Promise<{ token: string; expiresAt: string }> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_MAX_AGE_SECONDS;

  const token = await new SignJWT({
    userid: payload.userid,
    email: payload.email,
    phone: payload.phone,
    role: payload.role,
    nickname: payload.nickname,
    avatarFileName: payload.avatarFileName,
    // Mark this as a mobile token to distinguish from NextAuth tokens
    iss: "yuanlu-mobile",
  } as JWTPayload & MobileTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getSecretKey());

  return {
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

/**
 * Verify a mobile JWT token and extract the payload.
 * Returns null if the token is invalid, expired, or not a mobile token.
 */
export async function verifyMobileToken(
  token: string,
): Promise<MobileTokenVerifyResult | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    // Ensure this is a mobile-issued token
    if (payload.iss !== "yuanlu-mobile") {
      return null;
    }

    // Validate required fields
    if (!payload.userid || !payload.email) {
      return null;
    }

    return {
      userid: payload.userid as string,
      email: payload.email as string,
      phone: (payload.phone as string) || null,
      role: (payload.role as string) || "USER",
      nickname: (payload.nickname as string) || null,
      avatarFileName: (payload.avatarFileName as string) || null,
      exp: payload.exp as number,
      iat: payload.iat as number,
    };
  } catch {
    // Token is invalid, expired, or tampered with
    return null;
  }
}
