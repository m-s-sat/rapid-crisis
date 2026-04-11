import type { RedisClientType } from "redis";
import type { SensorSnapshot } from "../schema/ai_process.interface.js";

const WINDOW_SECONDS = 60;
const HALF_WINDOW = 30;
const TREND_THRESHOLD = 1.5;

interface TrendResult {
    is_rising: boolean;
    param?: string;
    old_avg?: number;
    new_avg?: number;
}

// Analyzes sensor readings over a 60s sliding window to detect rapid increases
export async function checkSensorTrends(
    redis: RedisClientType,
    venueId: string,
    zone: string,
    sensors: SensorSnapshot
): Promise<TrendResult[]> {
    const now = Date.now();
    const results: TrendResult[] = [];

    const trendableParams: (keyof SensorSnapshot)[] = [
        "temperature_c",
        "smoke_ppm",
        "co_ppm",
        "co2_ppm",
        "gas_lpg_ppm",
        "gas_methane_ppm",
        "sound_db",
        "vibration_g",
        "water_level_cm",
        "air_quality_index",
    ];

    for (const param of trendableParams) {
        const val = sensors[param];
        if (typeof val !== "number") continue;

        const key = `trend:${venueId}:${zone}:${param}`;
        
        // Add current reading
        await redis.zAdd(key, { score: now, value: `${now}:${val}` });
        
        // Remove old readings outside 60s window
        await redis.zRemRangeByScore(key, 0, now - WINDOW_SECONDS * 1000);
        
        // Get all readings in window
        const readings = await redis.zRangeByScore(key, now - WINDOW_SECONDS * 1000, now);
        if (readings.length < 3) continue; // Need at least 3 data points (20s) for trend baseline

        let oldSum = 0, oldCount = 0;
        let newSum = 0, newCount = 0;
        const middle = now - HALF_WINDOW * 1000;

        for (const r of readings) {
            const [tsStr, valStr] = r.split(":");
            const ts = parseInt(tsStr!);
            const v = parseFloat(valStr!);

            if (ts < middle) {
                oldSum += v;
                oldCount++;
            } else {
                newSum += v;
                newCount++;
            }
        }

        if (oldCount > 0 && newCount > 0) {
            const oldAvg = oldSum / oldCount;
            const newAvg = newSum / newCount;

            // Trigger if new average is 1.5x higher than old average (min baseline 5 units)
            if (oldAvg > 5 && newAvg > oldAvg * TREND_THRESHOLD) {
                results.push({
                    is_rising: true,
                    param: param as string,
                    old_avg: +oldAvg.toFixed(2),
                    new_avg: +newAvg.toFixed(2),
                });
            }
        }
    }

    return results;
}
