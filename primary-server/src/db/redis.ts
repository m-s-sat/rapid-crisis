import { createClient } from "redis";
import { env } from "../config/env.js";


export async function connectToRedis(){
    try{
        const client = createClient({
            url: JSON.stringify(env.REDIS_URL)
        })
        await client.connect();
        if(!client.isOpen) return null;
        return client;
    }
    catch(err: any){
        console.error("Error connecting to redis: ", err);
        return null;
    }
}