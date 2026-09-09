import { Redis } from "ioredis";
import type { BestOfferHotel } from "../types/hotel.js";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redisClient: Redis | null = null;

/**
 * Returns a singleton Redis instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
    });

    redisClient.on("error", (err) => {
      console.warn(`[Redis] Connection warning: ${err.message}`);
    });
  }

  return redisClient;
}

/**
 * Generates the Redis Sorted Set key for a given city
 */
export function getCityHotelsKey(city: string): string {
  return `hotels:city:${city.trim().toLowerCase()}`;
}

/**
 * Saves deduplicated hotel offers into Redis Sorted Set (ZSET)
 * Score = hotel price, Member = JSON serialized hotel object
 */
export async function saveHotelsToRedis(
  city: string,
  hotels: BestOfferHotel[],
  ttlSeconds = 3600
): Promise<void> {
  const client = getRedisClient();
  const key = getCityHotelsKey(city);

  try {
    if (client.status === "wait") {
      await client.connect();
    }

    const pipeline = client.pipeline();
    pipeline.del(key);

    for (const hotel of hotels) {
      // Member is the JSON representation, Score is the price for native Redis filtering
      pipeline.zadd(key, hotel.price, JSON.stringify(hotel));
    }

    if (hotels.length > 0) {
      pipeline.expire(key, ttlSeconds);
    }

    await pipeline.exec();
    console.log(`[Redis] Successfully saved ${hotels.length} hotels to sorted set "${key}"`);
  } catch (error) {
    console.warn(`[Redis] Could not save hotels to Redis: ${(error as Error).message}`);
  }
}

/**
 * Retrieves hotels from Redis using ZRANGEBYSCORE for server-side Redis price filtering
 */
export async function getHotelsFromRedisByPriceRange(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<BestOfferHotel[] | null> {
  const client = getRedisClient();
  const key = getCityHotelsKey(city);

  try {
    if (client.status === "wait") {
      await client.connect();
    }

    const exists = await client.exists(key);
    if (!exists) {
      return null;
    }

    const minScore = minPrice !== undefined ? minPrice : "-inf";
    const maxScore = maxPrice !== undefined ? maxPrice : "+inf";

    // Native Redis Price Filtering using ZRANGEBYSCORE
    const members = await client.zrangebyscore(key, minScore, maxScore);

    return members.map((m) => JSON.parse(m) as BestOfferHotel);
  } catch (error) {
    console.warn(`[Redis] Failed to query Redis cache: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Check Redis health status
 */
export async function checkRedisHealth(): Promise<{ status: "healthy" | "unhealthy"; latencyMs?: number; error?: string }> {
  const client = getRedisClient();
  const start = Date.now();
  try {
    if (client.status === "wait") {
      await client.connect();
    }
    const pong = await client.ping();
    return {
      status: pong === "PONG" ? "healthy" : "unhealthy",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      status: "unhealthy",
      error: (err as Error).message,
    };
  }
}
