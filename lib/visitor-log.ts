import prisma from "@/lib/prisma";
import { normalizeIp } from "@/core/utils/ip";

/**
 * 访问日志写入（服务端共享模块）。
 *
 * 两个写入方：
 * - Web 端 PageTracker → logVisit（lib/actions/log-actions.ts，"use server"）
 * - 小程序等非浏览器客户端 → POST /api/track-visit（app/api/track-visit/route.ts，
 *   path 带 wxapp/ 前缀）
 *
 * IP 统一走 normalizeIp（::ffff:a.b.c.d → a.b.c.d），保证历史与新数据、
 * 访问日志页与热力图去重口径一致。记录失败只打日志、绝不抛错，
 * 访问埋点不能影响主业务流程（与 lib/track.ts 同约定）。
 */
export async function recordVisitorLog(params: {
  ip: string;
  userAgent: string;
  path: string;
  userid?: string | null;
}): Promise<void> {
  try {
    await prisma.visitorLog.create({
      data: {
        ip: normalizeIp(params.ip),
        userAgent: params.userAgent,
        // 防御性截断：path 列为 VARCHAR(255)，调用方已限长，这里兜底
        path: params.path.slice(0, 255),
        userid: params.userid ?? null,
      },
    });
  } catch (error) {
    console.error("[visitor-log] Failed to record visit:", error);
  }
}
