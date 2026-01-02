"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { generateSignatureUrl } from "@/lib/oss";
import { Prisma } from "@prisma/client"; // 引入签名函数

export async function logVisit(path: string) {
  try {
    const session = await auth();
    const headersList = await headers();

    // 适配各类代理获取真实 IP
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    const userAgent = headersList.get("user-agent") || "Unknown";

    // 过滤内部请求
    if (
      path.startsWith("/_next") ||
      path.startsWith("/static") ||
      path.startsWith("/api")
    ) {
      return;
    }

    await prisma.visitorLog.create({
      data: {
        ip,
        userAgent,
        path,
        userid: session?.user?.userid || null,
      },
    });
  } catch (error) {
    console.error("Log visit error:", error);
  }
}

export async function getVisitorLogs(page = 1, pageSize = 20) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const skip = (page - 1) * pageSize;

  // 1. 获取原始数据，包含 avatarFileName
  const [logsRaw, total] = await Promise.all([
    prisma.visitorLog.findMany({
      orderBy: {
        createAt: Prisma.SortOrder.desc,
      },
      skip,
      take: pageSize,
      include: {
        User: {
          select: {
            email: true,
            user_profile: {
              select: {
                nickname: true,
                avatarUrl: true,
                avatarFileName: true,
              },
            },
          },
        },
      },
    }),
    prisma.visitorLog.count(),
  ]);

  // 2. 处理头像签名
  const logs = await Promise.all(
    logsRaw.map(async (log) => {
      const profile = log.User?.user_profile;

      // 如果有文件名且不是默认头像，进行签名
      if (
        profile?.avatarFileName &&
        profile.avatarFileName !== "default_avatar_url"
      ) {
        try {
          const signedUrl = await generateSignatureUrl(
            profile.avatarFileName,
            3600,
          ); // 1小时有效

          // 返回替换了 URL 的新对象
          return {
            ...log,
            User: {
              ...log.User!,
              user_profile: {
                ...profile,
                avatarUrl: signedUrl,
              },
            },
          };
        } catch (error) {
          console.error(`Failed to sign avatar for user ${log.userid}`, error);
        }
      }
      return log;
    }),
  );

  return { logs, total, totalPages: Math.ceil(total / pageSize) };
}
