import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcrypt";

// 定义 NextAuth 配置
const authOptions = {
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
        });

        if (!user) return null;

        // 验证密码
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );
        if (!isValid) return null;

        console.log("authorize", user);
        // 返回用户信息
        return { id: user.userid.toString(), phone: user.phone };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
      }
      console.log("jwt callback", token);
      return token;
    },
    async session({ session, token }) {
      // session.user.userid = token.id;
      // session.user.phone = token.phone;
      session.user = {
        ...session.user,
        phone: token.phone,
        userid: token.id,
      };
      console.log("session callback", session);
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // 用户登录时标记为在线
      await prisma.user.update({
        where: { userid: Number(user.id) },
        data: { isOnline: true, lastActiveAt: new Date() },
      });
      console.log("signIn callback", user);
    },
    async signOut({ token }) {
      // 用户退出时标记为离线
      await prisma.user.update({
        where: { userid: Number(token.id) },
        data: { isOnline: false },
      });
      console.log("signOut callback", token);
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // 在.env中配置
  session: {
    strategy: "jwt",
  },
};

// 初始化 NextAuth 并导出路由处理程序
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };
