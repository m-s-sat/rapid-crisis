import type { Request, Response } from "express";
import { SensorEvidence } from "../models/sensor_evidence.model.js";
import { redisManagerInstance } from "../db/redis.js";
import type { CrisisEvidencePayload } from "../schema/ai_process.interface.js";
import { checkSensorTrends } from "../services/trend.service.js";

// Enqueues sensor evidence for AI processing and checks for rapid trends
export async function processAiEvidence(req: Request, res: Response): Promise<any> {
    try {
        const payload: CrisisEvidencePayload = req.body;

        if (!payload.venue_id || !payload.sensors) {
            return res.status(400).json({
                success: false,
                message: "Missing venue_id or sensors in payload",
            });
        }

        await SensorEvidence.create(payload);

        const redisClient = await redisManagerInstance.getClient();
        if (!redisClient) {
            return res.status(503).json({
                success: false,
                message: "Redis unavailable",
            });
        }

        // Check for trends before queueing for AI
        const trends = await checkSensorTrends(
            redisClient,
            payload.venue_id,
            payload.location.zone,
            payload.sensors
        );

        if (trends.length > 0) {
            console.log(`[TREND] Warning in ${payload.location.zone}: ${trends.map(t => t.param).join(", ")} rising.`);
            await redisClient.publish("messaging_status", JSON.stringify({
                type: "trend_warning",
                venue_id: payload.venue_id,
                zone: payload.location.zone,
                trends: trends,
                message: `Rapid increase detected in ${payload.location.zone}: ${trends.map(t => t.param).join(", ")}`
            }));
        }

        // Queue for AI processing and respond with trend detection as a preliminary crisis flag
        await redisClient.lPush("ai_evidence_queue", JSON.stringify(payload));

        return res.status(202).json({
            success: true,
            message: "Evidence queued for AI processing",
            crisis_detected: trends.length > 0 // Map trends to crisis_detected for immediate IoT feedback
        });
    } catch (err: any) {
        console.error("AI Process Controller Error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to queue crisis evidence",
            error: err.message || err.toString(),
        });
    }
}
