import NextAuth, { User } from "next-auth";
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

          console.log("avatarUrl:", avatarUrl);

          // return JSON object with the user data
          return {
            id: user.userid,
            userid: user.userid,
            email: user.email,
            role: user.role || "USER",
            emailVerified: user.emailVerified,
            avatarUrl: avatarUrl || null,
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
  // callbacks: {
  //   async jwt({ token, user }: { token: JWT; user: User }) {
  //     if (user) {
  //       token.userid = user.userid;
  //       token.email = user.email;
  //       token.role = user.role;
  //       token.emailVerified = user.emailVerified || null;
  //       token.nickname = user.nickname;
  //     }
  //     return token;
  //   },
  //   async session({ session, token }: { session: Session; token: JWT }) {
  //     session.user = {
  //       ...session.user,
  //       email: token.email,
  //       userid: token.userid,
  //       role: token.role,
  //       avatarUrl: token.avatarUrl,
  //       nickname: token.nickname,
  //     };
  //     return session;
  //   },
  // },
  events: {
    async signIn({ user }: { user: User }) {
      // 用户登录时标记为在线
      await prisma.user.update({
        where: { userid: user.userid },
        data: { isOnline: true, lastActiveAt: new Date() },
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
