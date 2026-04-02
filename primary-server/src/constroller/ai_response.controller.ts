import type { Request, Response } from "express";
import { redisManagerInstance } from "../db/redis.js";
import type { ai_response } from "../schema/ai_response.interface.js";
import { AiResponse } from "../models/ai_response.model.js";

export async function sendAiResponseToQueue(req: Request, res: Response): Promise<any> {
    try {
        const aiResponse: ai_response = req.body;
        if(!aiResponse.crisis){
            console.log("no crisis encountered");
            return res.send({
                success: false,
                message: "no crisis encountered",
            });
        }
        
        const venue_details = await AiResponse.findOne({venue: aiResponse.venue}).populate("venue");
        const crisis_details = await AiResponse.findOne({crisis: aiResponse.crisis}).populate("crisis");
        if(!venue_details || !crisis_details){
            console.log("no venue and crisis found");
            return res.send({
                success: false,
                message: "no venue and crisis found"
            });
        }
        const redisPayload = {
            venue_details: venue_details.venue,
            crisis_details: crisis_details.crisis,
            confidence_score: aiResponse.confidence_score,
            status: aiResponse.status,
            zones: aiResponse.zones
        }
        const redisClient = await redisManagerInstance.getClient();
        if(!redisClient){
            console.log("no redis client found");
            return res.send({
                success: false,
                message: "no redis client found"
            });
        }
        await redisClient.lPush("ai_response", JSON.stringify(redisPayload));
        return res.send({
            success: true,
            message: "AI response sent to queue",
            data: redisPayload
        });
    }
    catch (err: any) {
        console.error("AI Response Controller Error:", err);
        return res.json({
            success: false,
            message: "Failed to send AI response to queue",
            error: err.message || err.toString()
        })
    }
}