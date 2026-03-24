import Redis from 'ioredis';

let redis = null;

export const connectRedis = () => {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      family: 0, // IMPORTANT for Upstash to prefer IPv4/IPv6 correctly
      retryStrategy(times) {
        if (times > 3) {
          console.warn('⚠️  Redis unavailable, running without cache');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => console.log('✅ Redis connected'));
    redis.on('error', (err) => console.warn('⚠️  Redis error:', err.message));

    redis.connect().catch(() => {
      console.warn('⚠️  Redis not available, caching disabled');
      redis = null;
    });
  } catch (error) {
    console.warn('⚠️  Redis setup failed:', error.message);
    redis = null;
  }
};

export const getRedis = () => redis;

export default { connectRedis, getRedis };
