import { getRedisClient } from "../../../config/redis";
import { AiWrapper } from "@prisma/client";

export class WrapperCacheService {
  private static instance: WrapperCacheService;
  private readonly CACHE_PREFIX = "SAIRA_AI:WRAPPER:";
  private readonly DEFAULT_TTL = 600; // 10 minutes

  private constructor() {}

  public static getInstance(): WrapperCacheService {
    if (!WrapperCacheService.instance) {
      WrapperCacheService.instance = new WrapperCacheService();
    }
    return WrapperCacheService.instance;
  }

  /**
   * Retrieves an active wrapper configuration from Redis cache.
   */
  public async getCachedWrapper(wrapperKey: string): Promise<AiWrapper | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      const data = await redis.get<string>(`${this.CACHE_PREFIX}${wrapperKey}`);
      if (!data) return null;
      
      // Upstash Redis might return already parsed objects or raw strings depending on config.
      if (typeof data === "object") return data as unknown as AiWrapper;
      return JSON.parse(data) as AiWrapper;
    } catch (err: any) {
      console.warn(`[WRAPPER CACHE] Failed to read from Redis for ${wrapperKey}:`, err.message);
      return null;
    }
  }

  /**
   * Caches a compiled wrapper configuration in Redis.
   */
  public async setCachedWrapper(wrapperKey: string, wrapper: AiWrapper): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      await redis.set(
        `${this.CACHE_PREFIX}${wrapperKey}`,
        JSON.stringify(wrapper),
        { ex: this.DEFAULT_TTL }
      );
    } catch (err: any) {
      console.warn(`[WRAPPER CACHE] Failed to set cache for ${wrapperKey}:`, err.message);
    }
  }

  /**
   * Invalidates cached wrapper configurations instantly on updates (Hot Invalidation).
   */
  public async invalidateWrapper(wrapperKey: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      await redis.del(`${this.CACHE_PREFIX}${wrapperKey}`);
      console.log(`[WRAPPER CACHE] Invalidation triggered. Nuke cache for wrapper: ${wrapperKey}`);
    } catch (err: any) {
      console.warn(`[WRAPPER CACHE] Failed to nuke cache for ${wrapperKey}:`, err.message);
    }
  }
}
