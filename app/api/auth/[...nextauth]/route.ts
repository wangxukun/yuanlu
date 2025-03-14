import NextAuth from "next-auth";
import { authOptions } from "@/app/lib/auth";

// 初始化 NextAuth 并导出路由处理程序
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; // 仅导出HTTP方法
