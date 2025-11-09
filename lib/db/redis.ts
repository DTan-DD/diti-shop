import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST || "redis://127.0.0.1:6379";

const redis = new Redis(redisUrl, {
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
  // optional: enable offline queue depending on your needs
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
redis.on("error", (err: any) => {
  console.error("[redis] error:", err?.message || err);
});

redis.on("connect", () => {
  console.log("[redis] connected");
});

export default redis;
