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

    // Publish telemetry for live dashboard (even if AI analysis is skipped)
    await redisClient.publish("sensor_data", JSON.stringify({
      venue_id: payload.venue_id,
      payload: {
        device_id: payload.device_id,
        sensors: payload.sensors,
        location: payload.location,
        timestamp: payload.timestamp
      }
    }));

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

        // CRITICAL OPTIMIZATION: Only queue for expensive AI analysis if triggers are met
        const s = payload.sensors;
        const isSpiking = s.smoke_ppm > 40 || s.temperature_c > 45 || s.flame_detected || s.gas_lpg_ppm > 50 || s.water_level_cm > 5;
        const hasTrend = trends.length > 0;

        if (isSpiking || hasTrend) {
            console.log(`[AI-TRIGGER] ${payload.location.zone}: Sensor spike or trend detected. Queueing for AWS Bedrock analysis.`);
            await redisClient.lPush("ai_evidence_queue", JSON.stringify(payload));
        } else {
            console.log(`[AI-FILTER] ${payload.location.zone}: Normal readings. Skipping AI analysis to save credits.`);
        }

        return res.status(202).json({
            success: true,
            message: (isSpiking || hasTrend) ? "Evidence queued for expensive AI analysis" : "Evidence logged (AI analysis skipped for normal values)",
            crisis_detected: (isSpiking || hasTrend)
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
