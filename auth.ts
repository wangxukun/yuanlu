import NextAuth, { Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { ZodError } from "zod";
import { signInSchema } from "@/lib/form-schema";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { AdapterSession } from "@auth/core/adapters";
import { generateSignatureUrl } from "@/lib/oss";
import { authConfig } from "@/auth.config";

// 1. 定义期望从数据库获取的数据结构
type UserFromPrisma = {
  userid: string;
  email: string;
  password: string;
  role: string | null;
  languagePreference: string | null;
  createAt: Date;
  updateAt: Date;
  isOnline: boolean;
  lastActiveAt: Date | null;
  isCommentAllowed: boolean;
  emailVerified: Date | null;
  user_profile: {
    avatarFileName: string | null;
    avatarUrl: string | null;
    nickname: string | null;
  } | null;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig, // 继承配置
  trustHost: true,
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials) return null;

        try {
          const { email, password } =
            await signInSchema.parseAsync(credentials);
          // 查找用户
          // 2. 查找用户并强制转换类型 (as UserFromPrisma | null)
          // 这样 TypeScript 就能明确知道 user 变量包含哪些字段
          const user = (await prisma.user.findUnique({
            where: { email },
            include: {
              user_profile: true, // 关联查询资料表
            },
          })) as UserFromPrisma | null;

          if (!user) {
            throw new Error("Invalid credentials.");
          }

          // 验证密码
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

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
            role: user.role || "USER",
            emailVerified: user.emailVerified,
            avatarUrl: avatarUrl || null,
            avatarFileName: user.user_profile?.avatarFileName || null,
            nickname: user.user_profile?.nickname || null,
          } as User;
        } catch (error) {
          if (error instanceof ZodError) {
            // Return `null` to indicate that the credentials are invalid
            return null;
          }
          return null;
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
        token.role = user.role;
        token.emailVerified = user.emailVerified || null;
        token.nickname = user.nickname;
        token.avatarFileName = user.avatarFileName;
        token.lastSeenAt = Date.now(); // 标记首次登录时间
      }

      // 2. 处理客户端的 update() 调用
      if (trigger === "update" && session?.user) {
        console.log("Updating session token:", session.user);
        if (session.user.nickname) token.nickname = session.user.nickname;
        if (session.user.avatarFileName)
          token.avatarFileName = session.user.avatarFileName;
      }

      // 3. [核心修复] 检测浏览器会话恢复（cookie 自动登录）
      // 当 token 中已有 userid（非首次登录）且距上次访问超过30分钟时，
      // 认为这是一次新的浏览器会话恢复，递增 loginCount
      if (!user && token.userid) {
        const SESSION_GAP_THRESHOLD = 30 * 60 * 1000; // 30 minutes in ms
        const lastSeenAt = (token.lastSeenAt as number) || 0;
        const now = Date.now();

        if (now - lastSeenAt > SESSION_GAP_THRESHOLD) {
          try {
            await prisma.user.updateMany({
              where: {
                userid: token.userid as string,
                OR: [
                  { lastActiveAt: null },
                  {
                    lastActiveAt: { lt: new Date(now - SESSION_GAP_THRESHOLD) },
                  },
                ],
              },
              data: {
                isOnline: true,
                lastActiveAt: new Date(now),
                loginCount: { increment: 1 },
              },
            });
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
        session.user.role = token.role as string;
        session.user.nickname = token.nickname as string | null;
        session.user.emailVerified = token.emailVerified as Date | null;

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
