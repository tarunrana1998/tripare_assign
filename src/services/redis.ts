import { Redis } from "ioredis";
import type { BestOfferHotel } from "../types/hotel.js";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// In-memory fallback sorted set store for standalone localhost runs without Redis
const memoryZSetStore = new Map<string, BestOfferHotel[]>();

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
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 2) return null;
        return 200;
      },
    });

    redisClient.on("connect", () => {
      isRedisAvailable = true;
      console.log("[Redis] Connected to Redis server successfully.");
    });

    redisClient.on("error", (err) => {
      isRedisAvailable = false;
      // Silent in local fallback mode
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
  const key = getCityHotelsKey(city);

  // Always update memory store for instantaneous fallback
  memoryZSetStore.set(key, [...hotels].sort((a, b) => a.price - b.price));

  try {
    const client = getRedisClient();
    if (client.status === "wait") {
      await client.connect();
    }

    const pipeline = client.pipeline();
    pipeline.del(key);

    for (const hotel of hotels) {
      // Member is JSON, Score is price for native Redis filtering
      pipeline.zadd(key, hotel.price, JSON.stringify(hotel));
    }

    if (hotels.length > 0) {
      pipeline.expire(key, ttlSeconds);
    }

    await pipeline.exec();
    console.log(`[Redis] Successfully saved ${hotels.length} hotels to sorted set "${key}"`);
  } catch (error) {
    // Graceful fallback to memory store
    console.log(`[Redis Cache] Saved ${hotels.length} hotels for "${city}" in local memory store (Redis offline).`);
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
  const key = getCityHotelsKey(city);

  try {
    const client = getRedisClient();
    if (client.status === "wait") {
      await client.connect();
    }

    const exists = await client.exists(key);
    if (exists) {
      const minScore = minPrice !== undefined ? minPrice : "-inf";
      const maxScore = maxPrice !== undefined ? maxPrice : "+inf";

      // Native Redis Price Filtering using ZRANGEBYSCORE
      const members = await client.zrangebyscore(key, minScore, maxScore);
      return members.map((m) => JSON.parse(m) as BestOfferHotel);
    }
  } catch (error) {
    // Redis unavailable, use memory store
  }

  // In-memory fallback querying
  const memoryHotels = memoryZSetStore.get(key);
  if (!memoryHotels) {
    return null;
  }

  return memoryHotels.filter((hotel) => {
    if (minPrice !== undefined && hotel.price < minPrice) return false;
    if (maxPrice !== undefined && hotel.price > maxPrice) return false;
    return true;
  });
}

/**
 * Check Redis health status
 */
export async function checkRedisHealth(): Promise<{ status: "healthy" | "unhealthy" | "memory_fallback"; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    const client = getRedisClient();
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
      status: "memory_fallback",
      error: "Redis server not running on localhost:6379 (using built-in memory fallback)",
    };
  }
}
