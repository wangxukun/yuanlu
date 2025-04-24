import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 在文件顶部添加
const ROUTE_CONFIG = {
  user: {
    redirectPath: "/",
    allowedRoutes: ["/personal-center", "/settings", "/notifications"],
  },
  admin: {
    redirectPath: "/dashboard",
    allowedRoutes: ["/dashboard", "/admin/users", "/admin/analytics"],
  },
  premium: {
    redirectPath: "/dashboard",
    allowedRoutes: ["/dashboard", "/admin/users", "/admin/analytics"],
  },
} as const;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // 获取 JWT Token
  const token = await getToken({ req: request });

  // 如果用户未登录，重定向到登录页面
  if (!token) {
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return NextResponse.next();
  }

  // 根据用户的角色进行路由拦截
  // const { role } = token;
  // const config = ROUTE_CONFIG[role] || ROUTE_CONFIG.users;
  const { role } = token as { role: keyof typeof ROUTE_CONFIG }; // 类型断言
  const config = ROUTE_CONFIG[role] ?? ROUTE_CONFIG.user; // 使用空值合并运算符

  // 如果用户没有访问权限，重定向到默认页面(禁止访问未授权的页面)
  if (!config.allowedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL(config.redirectPath, request.url));
  }

  // 如果用户访问登录页面，重定向到默认页面
  if (pathname == "/auth/login") {
    return NextResponse.redirect(new URL(config.redirectPath, request.url));
  }
  // 如果用户已登录，继续处理请求
  return NextResponse.next();
}

// 配置需要拦截的路由
export const config = {
  matcher: ["/dashboard/:path*"], // 只拦截 /dashboard 下的路由
};
