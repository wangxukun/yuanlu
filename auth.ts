import { headers, cookies } from "next/headers";
import NextAuth, { Session, User, CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { ZodError } from "zod";
import { signInSchema } from "@/lib/form-schema";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { AdapterSession } from "@auth/core/adapters";
import { generateSignatureUrl } from "@/lib/oss";
import { authConfig } from "@/auth.config";
import { SmsAuthService } from "@/core/auth/sms-auth.service";
import { deriveDisplayRole } from "@/lib/premium-role";

// CustomAuthError has been removed as NextAuth strictly strips custom error properties.
// We now use cookies as a side-channel for custom error messages.

// 1. 定义期望从数据库获取的数据结构
type UserFromPrisma = {
  userid: string;
  email: string;
  password: string | null;
  phone: string | null;
  phoneVerified: boolean;
  role: string | null;
  languagePreference: string | null;
  createAt: Date;
  updateAt: Date;
  isOnline: boolean;
  sessionVersion: number;
  lastActiveAt: Date | null;
  isCommentAllowed: boolean;
  isLoginAllowed: boolean;
  emailVerified: Date | null;
  user_profile: {
    avatarFileName: string | null;
    avatarUrl: string | null;
    nickname: string | null;
  } | null;
  subscriptions: {
    subscriptionid: number;
    subscriptionType: string;
    endDate: Date | null;
  }[];
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig, // 继承配置
  trustHost: true,
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" },
        phone: { label: "phone", type: "text" },
        code: { label: "code", type: "text" },
      },
      authorize: async (credentials) => {
        if (!credentials) return null;

        try {
          const parsed = await signInSchema.parseAsync(credentials);
          let user: UserFromPrisma | null = null;

          if ("phone" in parsed) {
            const { phone, code } = parsed;
            const isValid = await SmsAuthService.verifySmsCode({
              phone,
              code,
              scene: "LOGIN",
            });
            if (!isValid) throw new Error("验证码错误或已过期");

            user = (await prisma.user.findUnique({
              where: { phone },
              include: {
                user_profile: true,
                subscriptions: {
                  where: { subscriptionType: "PREMIUM" },
                  orderBy: { endDate: "desc" },
                },
              },
            })) as UserFromPrisma | null;

            if (!user) {
              const headersList = await headers();
              const clientIp =
                headersList.get("x-forwarded-for") ||
                headersList.get("x-real-ip") ||
                "Unknown";

              // 自动注册逻辑：如果用户不存在，则创建新用户
              const newUser = await prisma.user.create({
                data: {
                  phone,
                  email: `${phone}@placeholder.yuanlu.com`, // schema 要求 email 必填
                  registerIp: clientIp,
                  user_profile: {
                    create: {
                      nickname: `用户_${phone.slice(-4)}`,
                    },
                  },
                },
                include: { user_profile: true },
              });
              user = {
                ...newUser,
                subscriptions: [],
              } as UserFromPrisma;
            }
          } else {
            const { email, password } = parsed;
            user = (await prisma.user.findUnique({
              where: { email },
              include: {
                user_profile: true,
                subscriptions: {
                  where: { subscriptionType: "PREMIUM" },
                  orderBy: { endDate: "desc" },
                },
              },
            })) as UserFromPrisma | null;

            if (!user) {
              throw new Error("邮箱或密码错误");
            }

            if (!user.password) {
              throw new Error("该账号尚未设置密码，请使用验证码登录");
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) return null;
          }

          // 会员角色的升降级统一由下方 jwt 回调的"订阅状态派生同步"处理
          // （登录即触发首次同步），登录路径不再单独实现一份降级逻辑，
          // 也不再删除过期订阅记录——订阅流水是账目与漏斗分析的事实数据。

          // [新增] 检查登录权限限制功能
          if (user.isLoginAllowed === false) {
            throw new Error("由于违反相关规定，您的账号已被禁止登录！");
          }

          // 生成头像签名 URL
          // 注意：需要处理 user_profile 可能为空的情况
          let avatarUrl = "";
          if (user.user_profile?.avatarFileName) {
            avatarUrl = await generateSignatureUrl(
              user.user_profile.avatarFileName,
              3600 * 3,
            );
          } else if (user.user_profile?.avatarUrl) {
            avatarUrl = user.user_profile.avatarUrl;
          }

          // return JSON object with the user data
          return {
            id: user.userid,
            userid: user.userid,
            email: user.email,
            phone: user.phone || null,
            phoneVerified: user.phoneVerified || false,
            role: user.role || "USER",
            emailVerified: user.emailVerified,
            avatarUrl: avatarUrl || null,
            avatarFileName: user.user_profile?.avatarFileName || null,
            nickname: user.user_profile?.nickname || null,
            sessionVersion: user.sessionVersion,
          } as User;
        } catch (error) {
          if (error instanceof ZodError) return null;

          const errorMsg =
            error instanceof Error ? error.message : "验证码错误或已过期";

          // Use cookies as a side-channel to pass the actual error message to the client
          try {
            const cookieStore = await cookies();
            cookieStore.set("custom_auth_error", errorMsg, {
              maxAge: 10,
              path: "/",
            });
          } catch {
            /* ignore */
          }

          throw new CredentialsSignin();
        }
      },
    }),
  ],
  // [新增] 在这里覆盖 authConfig 的 callbacks
  callbacks: {
    async jwt({
      token,
      user,
      trigger,
      session,
    }: {
      token: JWT;
      user: User;
      trigger?: "signIn" | "signUp" | "update";
      session?: Session;
    }) {
      // 1. 首次登录：将用户信息写入 token（继承自 authConfig 的逻辑）
      if (user) {
        token.userid = user.userid;
        token.email = user.email;
        token.phone = user.phone;
        token.phoneVerified = user.phoneVerified;
        token.role = user.role;
        token.emailVerified = user.emailVerified || null;
        token.nickname = user.nickname;
        token.avatarFileName = user.avatarFileName;
        token.sessionVersion = user.sessionVersion as number;
        token.lastSeenAt = Date.now(); // 标记首次登录时间
      }

      // 2. 处理客户端的 update() 调用
      if (trigger === "update" && session?.user) {
        console.log("Updating session token:", session.user);
        if (session.user.nickname) token.nickname = session.user.nickname;
        if (session.user.avatarFileName)
          token.avatarFileName = session.user.avatarFileName;
        // [安全] role 不允许通过客户端 update() 传入，否则已登录用户可伪造会员身份。
        // role 仅由下方"订阅状态派生同步"决定（5 分钟节流 + update() 触发时
        // 立即强制），客户端传入的 role 一律忽略。
        // Support binding updates
        if (session.user.phone !== undefined) token.phone = session.user.phone;
        if (session.user.phoneVerified !== undefined)
          token.phoneVerified = session.user.phoneVerified;
        if (session.user.email) token.email = session.user.email;
      }

      const now = Date.now();

      // 3. [P0-1/P1-2] 将 role 对齐为订阅状态的派生展示缓存（单一口径）
      //    执行层（isPremiumUser）只认 ADMIN + 有效订阅，role 不再是权利来源；
      //    本段仅维护"展示标签"并保证它与订阅状态一致：
      //    - ADMIN 保持不变；
      //    - 有有效订阅（endDate > now，与 guard.ts 的 gt 判定同口径）→ PREMIUM，
      //      覆盖 Webhook 激活后的升级（Webhook 已停写 role）；
      //    - 无有效订阅 → USER（到期自然降级）。
      //    派生结果回写 DB：移动端与站内统计看到的缓存与订阅状态一致。
      //    节流：常规请求 5 分钟校准一次；客户端 update() 触发时立即强制校准
      //    （P1-2：付费激活轮询命中后调用 updateSession()，前端锁定态即时消失，
      //    不必等 5 分钟边界）。注意：不再删除过期订阅记录（保留账目历史）。
      const lastRoleCheck = (token.lastRoleCheck as number) || 0;
      const forceRoleCheck = trigger === "update";
      if (
        token.userid &&
        (forceRoleCheck || now - lastRoleCheck > 5 * 60 * 1000)
      ) {
        try {
          const userInDb = await prisma.user.findUnique({
            where: { userid: token.userid as string },
            include: {
              subscriptions: {
                where: { subscriptionType: "PREMIUM" },
                orderBy: { endDate: "desc" },
                take: 1,
              },
            },
          });

          if (userInDb) {
            const effectiveRole = deriveDisplayRole(
              userInDb.role,
              userInDb.subscriptions?.[0]?.endDate ?? null,
            );

            if ((userInDb.role || "USER") !== effectiveRole) {
              await prisma.user.update({
                where: { userid: userInDb.userid },
                data: { role: effectiveRole },
              });
            }

            token.role = effectiveRole;

            // [新增] 检查用户是否被管理员踢出（判断 sessionVersion 是否变化）
            if (userInDb.sessionVersion !== token.sessionVersion) {
              token.error = "SessionExpired";
            } else {
              delete token.error;
            }
          }
          token.lastRoleCheck = now;
        } catch (error) {
          console.error("Failed to sync user role in jwt callback", error);
        }
      }

      // 4. [核心修复] 检测浏览器会话恢复（cookie 自动登录）
      // 当 token 中已有 userid（非首次登录）且距上次访问超过30分钟时，
      // 认为这是一次新的浏览器会话恢复，递增 loginCount
      if (!user && token.userid) {
        const SESSION_GAP_THRESHOLD = 30 * 60 * 1000; // 30 minutes in ms
        const lastSeenAt = (token.lastSeenAt as number) || 0;

        if (now - lastSeenAt > SESSION_GAP_THRESHOLD) {
          try {
            // 在恢复会话前，先检查用户是否被踢出（判断 sessionVersion 是否变化）
            const dbUser = await prisma.user.findUnique({
              where: { userid: token.userid as string },
              select: { sessionVersion: true },
            });

            if (dbUser && dbUser.sessionVersion !== token.sessionVersion) {
              // 用户已被踢出，不能恢复会话
              token.error = "SessionExpired";
            } else {
              await prisma.user.updateMany({
                where: {
                  userid: token.userid as string,
                  OR: [
                    { lastActiveAt: null },
                    {
                      lastActiveAt: {
                        lt: new Date(now - SESSION_GAP_THRESHOLD),
                      },
                    },
                  ],
                },
                data: {
                  isOnline: true,
                  lastActiveAt: new Date(now),
                  loginCount: { increment: 1 },
                },
              });
            }
          } catch (e) {
            console.error(
              "Failed to increment loginCount on session restore:",
              e,
            );
          }
        }

        // 更新 lastSeenAt 为当前时间
        token.lastSeenAt = now;
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.userid = token.userid as string;
        session.user.email = token.email as string;
        session.user.phone = token.phone as string | null;
        session.user.phoneVerified = (token.phoneVerified as boolean) || false;
        session.user.role = token.role as string;
        session.user.nickname = token.nickname as string | null;
        session.user.emailVerified = token.emailVerified as Date | null;
        session.user.sessionVersion = token.sessionVersion as number;

        if (token.error) {
          session.error = token.error as string;
        }

        // [核心修复逻辑]
        // 如果 Token 中有文件名，每次获取 Session 时都重新生成签名 URL
        if (token.avatarFileName) {
          try {
            // 动态生成新的签名 URL (3小时有效期)
            const newAvatarUrl = await generateSignatureUrl(
              token.avatarFileName as string,
              3600 * 3,
            );
            session.user.avatarUrl = newAvatarUrl;
          } catch (e) {
            console.error("Session avatar refresh failed", e);
            session.user.avatarUrl = token.avatarUrl as string | null; // 降级方案
          }
        } else {
          // 如果没有文件名，使用旧的 url
          session.user.avatarUrl = token.avatarUrl as string | null;
        }
      }
      return session;
    },
  },
  events: {
    async signIn({ user }: { user: User }) {
      // 用户登录时标记为在线
      await prisma.user.update({
        where: { userid: user.userid },
        data: {
          isOnline: true,
          lastActiveAt: new Date(),
          loginCount: { increment: 1 },
        },
      });
    },
    async signOut(
      message:
        | { session: AdapterSession | null | undefined | void }
        | { token: JWT | null },
    ) {
      // 用户退出时标记为离线
      // if (message.token?.userid) {
      if ("token" in message && message.token?.userid) {
        await prisma.user.update({
          where: { userid: message.token.userid },
          data: { isOnline: false },
        });
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // 在.env中配置
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 设置会话过期时间为30天
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 设置会话过期时间为30天
  },
});
