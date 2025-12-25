import NextAuth, { NextAuthConfig, Session, User } from "next-auth";
import { JWT } from "next-auth/jwt";

export const authConfig = {
  providers: [], // Middleware 中不需要具体的 Providers
  pages: {
    signIn: "/login",
  },
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
      if (user) {
        token.userid = user.userid;
        token.email = user.email;
        token.role = user.role;
        token.emailVerified = user.emailVerified || null;
        token.nickname = user.nickname;
        token.avatarUrl = user.avatarUrl;
        token.avatarFileName = user.avatarFileName;
      }

      // 2. [新增] 处理客户端的 update() 调用
      // 当你在前端调用 update({...}) 时，数据会传到这里的 session 参数
      if (trigger === "update" && session?.user) {
        console.log("Updating session token:", session.user); // 调试日志

        // 更新 token 中的字段
        if (session.user.nickname) token.nickname = session.user.nickname;
        if (session.user.avatarUrl) token.avatarUrl = session.user.avatarUrl;
        if (session.user.avatarFileName)
          token.avatarFileName = session.user.avatarFileName;

        // 如果有其他需要更新的字段，也在这里赋值
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
