// core/auth/rate-limiter.service.ts
import redis from '@/lib/redis';

export class RateLimiterService {
  /**
   * 渐进式防刷限流检查
   * @param phone 手机号
   * @param ip 客户端 IP
   * @returns 检查结果
   */
  public static async checkSmsSendRateLimit(
    phone: string,
    ip: string,
  ): Promise<{ allowed: boolean; requireCaptcha: boolean; reason?: string }> {
    const keys = {
      phone60s: `sms:send:phone:${phone}:60s`,
      phone10m: `sms:send:phone:${phone}:10m`,
      phone24h: `sms:send:phone:${phone}:24h`,
      ip1m: `sms:send:ip:${ip}:1m`,
      ip1h: `sms:send:ip:${ip}:1h`,
    };

    // 1. 检查 60 秒内同一手机号是否已发送
    const phone60sExists = await redis.exists(keys.phone60s);
    if (phone60sExists) {
      return { allowed: false, requireCaptcha: false, reason: 'RATE_LIMITED_60S' };
    }

    // 2. 检查 24 小时同一手机号发送次数 (上限 15 次)
    const phone24hCount = parseInt((await redis.get(keys.phone24h)) || '0');
    if (phone24hCount >= 15) {
      return { allowed: false, requireCaptcha: false, reason: 'RATE_LIMITED_24H' };
    }

    // 3. 检查 1 小时同一 IP 发送次数 (上限 30 次)
    const ip1hCount = parseInt((await redis.get(keys.ip1h)) || '0');
    if (ip1hCount >= 30) {
      return { allowed: false, requireCaptcha: false, reason: 'RATE_LIMITED_IP_1H' };
    }

    // 4. 检查 10 分钟内同一手机号发送次数 (≥3次需要图形验证码)
    const phone10mCount = parseInt((await redis.get(keys.phone10m)) || '0');
    if (phone10mCount >= 3) {
      return { allowed: true, requireCaptcha: true };
    }

    // 5. 检查 1 分钟内同一 IP 发送次数 (≥5次需要图形验证码)
    const ip1mCount = parseInt((await redis.get(keys.ip1m)) || '0');
    if (ip1mCount >= 5) {
      return { allowed: true, requireCaptcha: true };
    }

    return { allowed: true, requireCaptcha: false };
  }

  /**
   * 记录成功的发送操作
   */
  public static async recordSmsSend(phone: string, ip: string): Promise<void> {
    const multi = redis.multi();
    
    // 设置 60s 限制
    multi.set(`sms:send:phone:${phone}:60s`, '1', 'EX', 60);

    // 记录 10 分钟次数
    const phone10mKey = `sms:send:phone:${phone}:10m`;
    multi.incr(phone10mKey);
    multi.expire(phone10mKey, 600, 'NX'); // 'NX' 仅在键没有过期时间时设置

    // 记录 24 小时次数
    const phone24hKey = `sms:send:phone:${phone}:24h`;
    multi.incr(phone24hKey);
    multi.expire(phone24hKey, 86400, 'NX');

    // 记录 IP 1 分钟次数
    const ip1mKey = `sms:send:ip:${ip}:1m`;
    multi.incr(ip1mKey);
    multi.expire(ip1mKey, 60, 'NX');

    // 记录 IP 1 小时次数
    const ip1hKey = `sms:send:ip:${ip}:1h`;
    multi.incr(ip1hKey);
    multi.expire(ip1hKey, 3600, 'NX');

    await multi.exec();
  }

  /**
   * 检查短信验证失败次数 (防暴力破解)
   * 如果 30 分钟内连续失败 5 次，则锁定
   */
  public static async checkVerifyAttemptLimit(phone: string): Promise<boolean> {
    const count = parseInt((await redis.get(`sms:verify:fail:${phone}`)) || '0');
    return count < 5;
  }

  /**
   * 增加验证失败次数
   */
  public static async incrementVerifyFailCount(phone: string): Promise<void> {
    const key = `sms:verify:fail:${phone}`;
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, 1800, 'NX'); // 30分钟
    await multi.exec();
  }

  /**
   * 重置验证失败次数
   */
  public static async resetVerifyFailCount(phone: string): Promise<void> {
    await redis.del(`sms:verify:fail:${phone}`);
  }
}
