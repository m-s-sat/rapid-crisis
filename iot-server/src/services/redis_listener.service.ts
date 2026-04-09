import { createClient } from "redis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { wss } from "../index.js";

let isPaused = false;
let currentVenueId = "";
let pauseTimeout: NodeJS.Timeout | null = null;
let pauseStartedAt: number = 0;
const PAUSE_DURATION_MS = 15 * 60 * 1000;

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
        logger.info("Connected to Redis for Messaging Status Listener");

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
                    logger.info(`Crisis overridden/canceled by admin. Resuming telemetry immediately.`);
                    broadcastToClients({ type: "telemetry_resumed" });
                } else if (data.type === "sent" || data.type === "decided_by_admin") {
                    if (data.venue_id && currentVenueId && data.venue_id !== currentVenueId) {
                        return;
                    }

                    logger.warn(`Received >40% confidence crisis event from backend! Pausing telemetry for 15 minutes.`);
                    isPaused = true;
                    pauseStartedAt = Date.now();
                    if (pauseTimeout) clearTimeout(pauseTimeout);
                    pauseTimeout = setTimeout(() => {
                        isPaused = false;
                        pauseStartedAt = 0;
                        pauseTimeout = null;
                        logger.info(`Resuming normal telemetry generation.`);
                        broadcastToClients({ type: "telemetry_resumed" });
                    }, PAUSE_DURATION_MS);
                    broadcastToClients({ type: "telemetry_paused", duration_ms: PAUSE_DURATION_MS });
                }
            } catch (err) {
                logger.error(`Failed to parse REDIS msg: ${err}`);
            }
        });
    } catch (err) {
        logger.error(`Failed to connect Redis Subscriber: ${err}`);
    }
}
