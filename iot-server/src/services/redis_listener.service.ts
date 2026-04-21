import { createClient } from "redis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { wss } from "../index.js";

let isPaused = false;
let currentVenueId = "";
let pauseTimeout: NodeJS.Timeout | null = null;
let pauseStartedAt: number = 0;
const PAUSE_DURATION_MS = 15 * 60 * 1000;

const redisClient = createClient({ url: env.REDIS_URL });
redisClient.on("error", (err) => logger.error(`Redis Client Error: ${err}`));
await redisClient.connect();

export function getPauseState() {
    return isPaused;
}

export function getPauseRemainingMs(): number {
    if (!isPaused || !pauseStartedAt) return 0;
    const elapsed = Date.now() - pauseStartedAt;
    const remaining = PAUSE_DURATION_MS - elapsed;
    return remaining > 0 ? remaining : 0;
}

export function setPauseVenueId(venueId: string) {
    currentVenueId = venueId;
}

export async function isSessionActive(): Promise<boolean> {
    if (!currentVenueId) return false;
    const key = `session:active:${currentVenueId}`;
    const exists = await redisClient.exists(key);
    return exists === 1;
}

export async function refreshSession() {
    if (!currentVenueId) return;
    const key = `session:active:${currentVenueId}`;
    await redisClient.set(key, "active", { EX: 30 });
}

export async function terminateSession() {
    if (!currentVenueId) return;
    const key = `session:active:${currentVenueId}`;
    await redisClient.del(key);
    logger.info(`Session terminated for venue: ${currentVenueId}`);
}

function broadcastToClients(data: object) {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(payload);
        }
    });
}

export async function startRedisListener() {
    const subscriber = createClient({ url: env.REDIS_URL });
    subscriber.on("error", (err) => logger.error(`Redis Subscriber Error: ${err}`));
    
    try {
        await subscriber.connect();
        await subscriber.subscribe("messaging_status", (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === "resume") {
                    isPaused = false;
                    pauseStartedAt = 0;
                    if (pauseTimeout) {
                        clearTimeout(pauseTimeout);
                        pauseTimeout = null;
                    }
                    broadcastToClients({ type: "telemetry_resumed" });
                } else if (data.type === "sent" || data.type === "decided_by_admin") {
                    if (data.venue_id && currentVenueId && data.venue_id !== currentVenueId) return;
                    isPaused = true;
                    pauseStartedAt = Date.now();
                    if (pauseTimeout) clearTimeout(pauseTimeout);
                    pauseTimeout = setTimeout(() => {
                        isPaused = false;
                        pauseStartedAt = 0;
                        pauseTimeout = null;
                        broadcastToClients({ type: "telemetry_resumed" });
                    }, PAUSE_DURATION_MS);
                    broadcastToClients({ type: "telemetry_paused", duration_ms: PAUSE_DURATION_MS });
                }
            } catch (err) {
                logger.error(`Redis msg parse error: ${err}`);
            }
        });
    } catch (err) {
        logger.error(`Redis listener error: ${err}`);
    }
}
