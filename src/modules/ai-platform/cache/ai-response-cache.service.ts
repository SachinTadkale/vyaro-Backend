import { getRedisClient } from "../../../config/redis";
import crypto from "crypto";

export class AiResponseCacheService {
  private static instance: AiResponseCacheService;
  private readonly CACHE_PREFIX = "SAIRA_AI:RESPONSE:";
  private readonly DEFAULT_TTL = 600; // 10 minutes (600s)

  private constructor() {}

  public static getInstance(): AiResponseCacheService {
    if (!AiResponseCacheService.instance) {
      AiResponseCacheService.instance = new AiResponseCacheService();
    }
    return AiResponseCacheService.instance;
  }

  /**
   * Generates a unique cache key based on wrapper key, prompt query, and session metadata.
   */
  private generateKey(wrapperKey: string, prompt: string, language?: string): string {
    const hash = crypto.createHash("sha256").update(`${prompt}:${language || "en"}`).digest("hex");
    return `${this.CACHE_PREFIX}${wrapperKey}:${hash}`;
  }

  /**
   * Fetches cached response from Redis.
   */
  public async getCachedResponse(
    wrapperKey: string,
    prompt: string,
    language?: string
  ): Promise<string | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    const cacheKey = this.generateKey(wrapperKey, prompt, language);
    try {
      return await redis.get<string>(cacheKey);
    } catch (err: any) {
      console.warn("[RESPONSE CACHE] Failed to get response cache:", err.message);
      return null;
    }
  }

  /**
   * Caches compiled AI response.
   */
  public async setCachedResponse(
    wrapperKey: string,
    prompt: string,
    response: string,
    language?: string,
    customTtlSeconds?: number
  ): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    const cacheKey = this.generateKey(wrapperKey, prompt, language);
    const ttl = customTtlSeconds ?? this.DEFAULT_TTL;

    try {
      await redis.set(cacheKey, response, { ex: ttl });
    } catch (err: any) {
      console.warn("[RESPONSE CACHE] Failed to set response cache:", err.message);
    }
  }

  /**
   * Clears response cache keys on demand.
   */
  public async invalidateResponse(wrapperKey: string, prompt: string, language?: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    const cacheKey = this.generateKey(wrapperKey, prompt, language);
    try {
      await redis.del(cacheKey);
    } catch (err: any) {
      console.warn("[RESPONSE CACHE] Failed to invalidate response cache:", err.message);
    }
  }
}
