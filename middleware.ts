import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // 获取 JWT Token
  const token = await getToken({ req: request });

  // 如果用户未登录，重定向到登录页面
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // 如果用户已登录，继续处理请求
  return NextResponse.next();
}

// 配置需要拦截的路由
export const config = {
  matcher: ["/dashboard/:path*"], // 只拦截 /dashboard 下的路由
};
