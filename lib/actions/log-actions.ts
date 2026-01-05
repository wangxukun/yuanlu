"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { generateSignatureUrl } from "@/lib/oss";
import { Prisma } from "@prisma/client"; // 引入签名函数
import { revalidatePath } from "next/cache";
import * as Searcher from "ip2region-ts";
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
      // 获取位置信息
      const location = await getLocation(log.ip || "");
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
            location,
          };
        } catch (error) {
          console.error(`Failed to sign avatar for user ${log.userid}`, error);
        }
      }
      return {
        ...log,
        location,
      };
    }),
  );

  return { logs, total, totalPages: Math.ceil(total / pageSize) };
}

let searcher = null;

// 初始化搜索器 (单例模式)
const getSearcher = () => {
  if (!searcher) {
    // ip2region-ts 自带了 xdb 数据文件
    searcher = Searcher.newWithFileOnly(Searcher.defaultDbFile);
  }
  return searcher;
};

// 工具函数：解析 IP 位置
const getLocation = async (ip: string) => {
  if (ip === "127.0.0.1" || ip === "::1") return "本地回环";
  try {
    const s = getSearcher();
    const data = await s.search(ip);
    // 格式化地域信息：中国|0|广东省|深圳市|电信 -> 广东省 深圳市
    const parts = data.region.split("|");
    const filtered = parts.filter((p: string) => p !== "0" && p !== "none");
    return filtered.length > 2
      ? `${filtered[2]} ${filtered[3] || ""}`.trim()
      : filtered[0];
  } catch (error) {
    console.error("Get location error:", error);
    return "未知地理位置";
  }
};

// 新增：删除日志功能
export async function deleteVisitorLog(logId: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  try {
    await prisma.visitorLog.delete({ where: { id: logId } });
    revalidatePath("/admin/logs"); // 重新验证缓存，刷新页面数据
    return { success: true };
  } catch (error) {
    console.error("Delete log error:", error);
    return { success: false, error: "删除失败" };
  }
}
