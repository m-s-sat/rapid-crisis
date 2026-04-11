import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { wss } from "../index.js";
import { captureAllMedia } from "./media.service.js";
import type { CrisisEvidencePayload, SensorReading } from "../types/sensor.types.js";

import { redisManagerInstance } from "../db/redis.js";

const AI_PROCESS_URL = `${env.PRIMARY_SERVER_URL}/api/ai/process`;

export async function getLastSensorPayload(venue_id?: string): Promise<CrisisEvidencePayload | null> {
    const redis = await redisManagerInstance.getClient();
    if (!redis) return null;
    const key = venue_id ? `last_telemetry:${venue_id}` : `last_telemetry:global`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
}

export async function transmitReading(reading: SensorReading): Promise<void> {
    logger.info(`${reading.device_id} | temp=${reading.sensors.temperature_c}°C smoke=${reading.sensors.smoke_ppm}ppm vib=${reading.sensors.vibration_g}g`);

    const media = captureAllMedia();

    const payload: CrisisEvidencePayload = {
        venue_id: reading.venue_id,
        device_id: reading.device_id,
        device_mac: reading.device_mac,
        timestamp: reading.timestamp,
        location: reading.location,
        sensors: reading.sensors,
        media,
    };

    // Cache the telemetry in Redis for reconnecting clients
    redisManagerInstance.getClient().then(redis => {
        if (redis) {
            redis.set(`last_telemetry:${payload.venue_id}`, JSON.stringify(payload), { EX: 3600 });
            redis.set(`last_telemetry:global`, JSON.stringify(payload), { EX: 3600 });
        }
    });

    // Broadcast directly to local connected frontend clients via WS!
    const wsPayload = JSON.stringify({ type: 'sensor_data', payload });
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
            client.send(wsPayload);
        }
    });

    try {
        const res = await fetch(AI_PROCESS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json() as Record<string, unknown>;

        if (res.ok && data.success) {
            // Logs immediate trend detection result from primary server
            logger.success(
                `${reading.device_id} → primary-server | trend_detected=${data.crisis_detected} (Full GenAI Pending)`
            );
        } else {
            logger.warn(
                `${reading.device_id} → primary-server responded: ${JSON.stringify(data)}`
            );
        }
    } catch (err: any) {
        logger.error(`${reading.device_id} → failed to reach primary-server: ${err.message}`);
    }
}
