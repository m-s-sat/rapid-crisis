import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

class RedisManager {
    private client: RedisClientType | null = null;

    async init() {
        if (this.client) return this.client;
        try {
            this.client = createClient({
                url: typeof env.REDIS_URL === "string" ? env.REDIS_URL : JSON.stringify(env.REDIS_URL)
            });
            await this.client.connect();
            logger.info("Shared Redis Client connected for state caching");
            return this.client;
        } catch (err) {
            logger.error(`Error connecting to Redis in IoT Server: ${err}`);
            return null;
        }
    }

    async getClient() {
        if (!this.client) {
            await this.init();
        }
        return this.client;
    }
}

export const redisManagerInstance = new RedisManager();
