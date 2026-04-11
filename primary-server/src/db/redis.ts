import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env.js";

class redisManager{
    private redisCLient: RedisClientType | null = null;

    async init(){
        try{
            this.redisCLient = createClient({
                url: typeof env.REDIS_URL === "string" ? env.REDIS_URL : JSON.stringify(env.REDIS_URL)
            })
            await this.redisCLient.connect();
            if(!this.redisCLient.isOpen) return null;
            return this.redisCLient;
        }
        catch(err: any){
            console.error("Error connecting to redis: ", err);
            return null;
        }
    }

    async getClient(){
        try{
            if(!this.redisCLient){
                await this.init();
            }
            return this.redisCLient;
        }
        catch(err: any){
            console.error("Error getting redis client: ", err);
            return null;
        }
    }
}

export const redisManagerInstance = new redisManager();