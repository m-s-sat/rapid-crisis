import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env.js";

class redisManager {
    private redisClient: RedisClientType | null = null;

    async init() {
        try {
            this.redisClient = createClient({
                url: typeof env.REDIS_URL === "string" ? env.REDIS_URL : JSON.stringify(env.REDIS_URL)
            });
            await this.redisClient.connect();
            if (!this.redisClient.isOpen) return null;
            return this.redisClient;
        } catch (err: any) {
            console.error("Error connecting to redis: ", err);
            return null;
        }
    }

    async getClient() {
        try {
            if (!this.redisClient) {
                await this.init();
            }
            return this.redisClient;
        } catch (err: any) {
            console.error("Error getting redis client: ", err);
            return null;
        }
    }
}

export const redisManagerInstance = new redisManager();
