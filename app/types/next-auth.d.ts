import "next-auth";
import { DefaultSession } from "next-auth";

// 示例中的类型声明作用分解
declare module "next-auth" {
  interface User {
    // ↓ 扩展 NextAuth 原生 User 类型
    phone: string; // → 允许用户对象携带 phone 字段
    id: string; // → 允许用户对象携带 userid 字段
    role: string; // → 允许用户对象携带 role 字段
  }

  interface Session {
    // ↓ 扩展 Session 类型
    user: {
      phone: string; // → 使 session.users.phone 类型合法化
      userid: string; // → 使 session.users.userid 类型合法化
      role: string; // → 使 session.users.role 类型合法化
    } & DefaultSession["user"]; // 保留默认字段(email/name等)
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    phone: string;
    role: string;
  }
}
