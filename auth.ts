import NextAuth, { Session, User } from "next-auth";
import Credentials from "@auth/core/providers/credentials";
import { ZodError } from "zod";
import { signInSchema } from "@/app/lib/form-schema";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials) return null;

        type UserFromPrisma = {
          userid: string;
          email: string;
          password: string;
          role: string | null;
        };

        try {
          let user = null;

          const { email, password } =
            await signInSchema.parseAsync(credentials);

          // 查找用户
          user = (await prisma.user.findUnique({
            where: { email },
            select: {
              userid: true,
              email: true,
              password: true,
              role: true,
            },
          })) as UserFromPrisma | null;

          if (!user) {
            throw new Error("Invalid credentials.");
          }

          // 验证密码
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

          // return JSON object with the user data
          return user;
        } catch (error) {
          if (error instanceof ZodError) {
            // Return `null` to indicate that the credentials are invalid
            return null;
          }
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: User }) {
      if (user) {
        token.userid = user.userid;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.user = {
        ...session.user,
        email: token.email,
        userid: token.userid,
        role: token.role,
      };
      return session;
    },
  },
  events: {
    async signIn({ user }: { user: User }) {
      // 用户登录时标记为在线
      await prisma.user.update({
        where: { userid: user.userid },
        data: { isOnline: true, lastActiveAt: new Date() },
      });
    },
    async signOut({ token }: { token: JWT }) {
      // 用户退出时标记为离线
      await prisma.user.update({
        where: { userid: token.userid },
        data: { isOnline: false },
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // 在.env中配置
  session: {
    strategy: "jwt",
  },
});
