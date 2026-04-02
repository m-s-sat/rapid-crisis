import type { Request, Response } from "express";
import { SensorEvidence } from "../models/sensor_evidence.model.js";
import { redisManagerInstance } from "../db/redis.js";
import type { CrisisEvidencePayload } from "../schema/ai_process.interface.js";

const TREND_WINDOW_MS = 60_000;
const TREND_TTL = 120;

async function recordAndCheckTrends(
    venueId: string,
    zone: string,
    sensors: Record<string, unknown>
): Promise<string[]> {
    const redis = await redisManagerInstance.getClient();
    if (!redis) return [];

    const now = Date.now();
    const metrics = ["smoke_ppm", "temperature_c", "co_ppm", "gas_lpg_ppm", "vibration_g", "humidity_pct"];
    const rising: string[] = [];

    for (const metric of metrics) {
        const val = sensors[metric];
        if (typeof val !== "number") continue;

        const key = `trend:${venueId}:${zone}:${metric}`;
        await redis.zAdd(key, { score: now, value: `${val}:${now}` });
        await redis.zRemRangeByScore(key, 0, now - TREND_WINDOW_MS);
        await redis.expire(key, TREND_TTL);

        const members = await redis.zRange(key, 0, -1);
        if (members.length < 4) continue;

        const values = members.map(m => parseFloat(m.split(":")[0] || "0"));
        const mid = Math.floor(values.length / 2);
        const oldAvg = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
        const newAvg = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);

        if (newAvg > oldAvg * 1.5 && newAvg > 0) {
            rising.push(metric);
        }
    }

    return rising;
}

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

        const risingMetrics = await recordAndCheckTrends(
            payload.venue_id,
            payload.location.zone,
            payload.sensors as unknown as Record<string, unknown>
        );

        if (risingMetrics.length > 0) {
            await redisClient.publish("messaging_status", JSON.stringify({
                type: "trend_warning",
                venue_id: payload.venue_id,
                zone: payload.location.zone,
                rising_metrics: risingMetrics,
                message: `Rising trend in ${payload.location.zone}: ${risingMetrics.join(", ")}`,
            }));
        }

        await redisClient.lPush("ai_evidence_queue", JSON.stringify(payload));

        return res.status(202).json({
            success: true,
            message: "Evidence queued for AI processing",
            trends: risingMetrics.length > 0 ? risingMetrics : undefined,
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
