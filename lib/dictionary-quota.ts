import prisma from "@/lib/prisma";
import { isPremiumUser } from "@/core/auth/guard";
import { FREE_DICTIONARY_DAILY_LIMIT } from "@/lib/quota";

/**
 * 词典查询每日配额（服务端）。
 *
 * 计数范围：有道词典 API 调用、LLM 词典缓存未命中的生成请求——
 * 两者都有按次成本；LLM 缓存命中零成本、不计数。
 * 会员/管理员不受限（不写入计数行）。
 */

export async function checkDictionaryQuota(user: {
  role?: string | null;
  userid?: string;
}): Promise<boolean> {
  if (await isPremiumUser(user)) return true;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const used = await prisma.dictionary_lookups.count({
    where: { userid: user.userid!, createdAt: { gte: todayStart } },
  });
  return used < FREE_DICTIONARY_DAILY_LIMIT;
}

export async function recordDictionaryLookup(
  userid: string,
  source: "youdao" | "llm",
  word?: string,
): Promise<void> {
  try {
    await prisma.dictionary_lookups.create({
      data: { userid, source, word: word?.slice(0, 255) },
    });
  } catch (error) {
    console.error("[dictionary-quota] Failed to record lookup:", error);
  }
}

/**
 * 匿名（未登录）用户 LLM 生成的 IP 级尽力而为限流。
 * 仅防枚举刷 LLM 的滥用，非精确配额：模块级内存计数，
 * 进程重启清零、多实例不共享，对小规模站点足够。
 */
const ANON_DAILY_LIMIT = 30;
const anonHits = new Map<string, { count: number; day: string }>();

export function anonymousLlmRateAllow(ip: string): boolean {
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const entry = anonHits.get(ip);
  if (!entry || entry.day !== day) {
    anonHits.set(ip, { count: 1, day });
    return true;
  }
  if (entry.count >= ANON_DAILY_LIMIT) return false;
  entry.count += 1;
  return true;
}
