import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

/**
 * Returns the singleton Upstash Redis client.
 * Connects via HTTP REST (stateless, serverless friendly).
 */
export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("⚠️  UPSTASH_REDIS credentials not set — Redis cache disabled. Settings will be read from DB on every request.");
    return null;
  }

  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}

export { redisClient };
