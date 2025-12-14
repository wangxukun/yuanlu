import NextAuth, { NextAuthConfig, Session, User } from "next-auth";
import { JWT } from "next-auth/jwt";

export const authConfig = {
  providers: [], // Middleware 中不需要具体的 Providers
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: User }) {
      if (user) {
        token.userid = user.userid;
        token.email = user.email;
        token.role = user.role;
        token.emailVerified = user.emailVerified || null;
        token.nickname = user.nickname;
        token.avatarUrl = user.avatarUrl;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.userid = token.userid as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.avatarUrl = token.avatarUrl as string | null;
        session.user.nickname = token.nickname as string | null;
        session.user.emailVerified = token.emailVerified as Date | null;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

// 专门导出一个用于 Middleware 的 auth 函数
export const { auth } = NextAuth(authConfig);
