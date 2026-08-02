import { Injectable, Logger } from "@nestjs/common";
import { Redis } from "@upstash/redis";

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get<T>(key);
      return value ?? null;
    } catch (error) {
      this.logger.error(`Failed to GET "${key}": ${errMessage(error)}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    try {
      await this.redis.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      this.logger.error(`Failed to SET "${key}": ${errMessage(error)}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to DEL "${key}": ${errMessage(error)}`);
    }
  }
}

function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
