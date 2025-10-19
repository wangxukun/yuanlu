import { auth } from "@/auth";
import {
  DEFAULT_LOGIN_REDIRECT,
  apiAuthPrefix,
  publicRoutes,
  userRoutes,
  adminRoutes,
  premiumRoutes,
} from "./routes";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;
  const isLoggedIn = !!req.auth;
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  // const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isPublicRoute = publicRoutes.some((route) => {
    if (route.includes(":id")) {
      return pathname.startsWith(route.split(":id")[0]);
    }
    return route === pathname;
  });
  const isUserRoute = userRoutes.includes(nextUrl.pathname);
  const isAdminRoute = adminRoutes.includes(nextUrl.pathname);
  const isPremiumRoute = premiumRoutes.includes(nextUrl.pathname);

  console.log("nextUrl", pathname);
  console.log("[middleware] nextUrl", pathname);
  console.log("[middleware] ENV", process.env.NODE_ENV);

  // 根路由重定向
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/browse", nextUrl));
  }
  // 允许API认证路由
  if (isApiAuthRoute) {
    return;
  }
  // 如果未登录且不是公开路由，重定向到登录
  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
  }

  // 角色检查
  if (isLoggedIn) {
    const role = req.auth?.user?.role;
    if (
      isUserRoute &&
      role !== "USER" &&
      role !== "PREMIUM" &&
      role !== "ADMIN"
    ) {
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    // ADMIN路由检查
    if (isAdminRoute && role !== "ADMIN") {
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    // PREMIUM路由检查
    if (isPremiumRoute && role !== "PREMIUM" && role !== "ADMIN") {
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
