import Redis from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    // 增加连接选项，提高容错性
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

redis.on('error', (err) => {
  if (process.env.CI || process.env.npm_lifecycle_event === 'build') {
    return; // 屏蔽 CI 环境或打包期间的无关报错日志
  }
  console.error('[Redis Error] ', err.message);
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
