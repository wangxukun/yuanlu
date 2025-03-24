import { AuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcrypt";

// 定义 NextAuth 配置
export const authOptions: AuthOptions = {
  // 配置身份提供商
  providers: [
    // 配置自定义身份提供商
    CredentialsProvider({
      name: "Phone and Password",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // 查找用户
        const user = await prisma.user.findUnique({
          where: { phone: credentials.phone },
          select: {
            userid: true,
            phone: true,
            password: true,
            role: true,
          },
        });

        if (!user) return null;

        // 验证密码
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );
        if (!isValid) return null;
        // 返回用户信息
        return {
          id: user.userid,
          phone: user.phone,
          role: user.role || "user",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: User }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.user = {
        ...session.user,
        phone: token.phone,
        userid: token.id,
        role: token.role,
      };
      return session;
    },
  },
  events: {
    async signIn({ user }: { user: User }) {
      // 用户登录时标记为在线
      await prisma.user.update({
        where: { userid: user.id },
        data: { isOnline: true, lastActiveAt: new Date() },
      });
    },
    async signOut({ token }: { token: JWT }) {
      // 用户退出时标记为离线
      await prisma.user.update({
        where: { userid: token.id },
        data: { isOnline: false },
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // 在.env中配置
  session: {
    strategy: "jwt",
  },
};

export type AuthOptionsType = typeof authOptions;
