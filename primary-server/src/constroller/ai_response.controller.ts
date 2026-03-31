import type { Request, Response } from "express";
import type { aiResponse } from "../schema/ai_response.js";
import { connectToRedis } from "../db/redis.js";

export async function sendAiResponseToQueue(req: Request, res: Response){
    try{
        const {crisis_type, confidence_score, venue_type, venue_name} = req.body;
        if(!crisis_type || !confidence_score || !venue_type || !venue_name){
            return res.json({
                success: false,
                message: "Missing required fields",
            })
        }
        const aiResponse: aiResponse = {
            crisis_type,
            confidence_score,
            venue_type,
            venue_name
        }
        const client = await connectToRedis();
        if(!client){
            return res.json({
                success: false,
                message: "Failed to connect to redis",
            })
        }
        await client.lPush("ai_response", JSON.stringify(aiResponse));
        return res.json({
            success: true,
            message: "AI response sent to queue",
        })
    }
    catch(err){
        return res.json({
            success: false,
            message: "Failed to send AI response to queue",
            error: err
        })
    }
}