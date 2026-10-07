"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAdminAction } from "@/core/auth/guard";
import { headers } from "next/headers";
import { generateSignatureUrl } from "@/lib/oss";
import { Prisma } from "@prisma/client"; // 引入签名函数
import { revalidatePath } from "next/cache";
import {
  isValidIp,
  loadContentFromFile,
  newWithBuffer,
  defaultDbFile,
} from "ip2region-ts";
import { normalizeIp } from "@/core/utils/ip";

// 核心技巧：通过 ReturnType 动态获取 Searcher 的实例类型
type SearcherInstance = ReturnType<typeof newWithBuffer>;
export async function logVisit(path: string) {
  try {
    const session = await auth();
    const headersList = await headers();

    // 适配各类代理获取真实 IP；归一化 ::ffff:a.b.c.d 映射形式，避免历史库里
    // 同一访客存两种写法导致按 IP 去重偏大
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor
      ? normalizeIp(forwardedFor.split(",")[0].trim())
      : "127.0.0.1";

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
  await requireAdminAction();

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

let searcher: SearcherInstance | null = null;

// 初始化搜索器 (单例模式)：整库载入内存，避免 newWithFileOnly 每次
// search 都重新打开 xdb 文件（日志页一次渲染要查 20 次）
const getSearcher = () => {
  if (!searcher) {
    // ip2region-ts 自带了 xdb 数据文件
    searcher = newWithBuffer(loadContentFromFile(defaultDbFile));
  }
  return searcher;
};

// 工具函数：解析 IP 位置
const getLocation = async (rawIp: string) => {
  const ip = normalizeIp(rawIp);
  if (ip === "127.0.0.1" || ip === "::1") return "本地回环";
  // ip2region 仅支持点分 IPv4：真实 IPv6（如 2408:…）直接标注，
  // 不进 search()，否则每行抛一次 invalid ip 刷错误日志
  if (!isValidIp(ip)) return ip.includes(":") ? "IPv6 地址" : "未知地理位置";
  try {
    const s = getSearcher();
    const data = await s.search(ip);
    // 添加空值检查
    if (!data || !data.region) {
      return "未知地理位置";
    }
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
  await requireAdminAction();

  try {
    await prisma.visitorLog.delete({ where: { id: logId } });
    revalidatePath("/admin/logs"); // 重新验证缓存，刷新页面数据
    return { success: true };
  } catch (error) {
    console.error("Delete log error:", error);
    return { success: false, error: "删除失败" };
  }
}
