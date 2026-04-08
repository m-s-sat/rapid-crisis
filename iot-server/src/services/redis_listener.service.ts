import { createClient } from "redis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

let isPaused = false;
let currentVenueId = ""; 
let pauseTimeout: NodeJS.Timeout | null = null;

export function getPauseState() {
    return isPaused;
}

export function setPauseVenueId(venueId: string) {
    currentVenueId = venueId;
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
                    if (pauseTimeout) {
                        clearTimeout(pauseTimeout);
                        pauseTimeout = null;
                    }
                    logger.info(`Crisis overridden/canceled by admin. Resuming telemetry immediately.`);
                } else if (data.type === "sent" || data.type === "decided_by_admin") {
                    if (data.venue_id && currentVenueId && data.venue_id !== currentVenueId) {
                        return; // Not our venue
                    }

                    // For any AI crisis that exceeded > 40%, pause our simulation
                    logger.warn(`Received >40% confidence crisis event from backend! Pausing telemetry for 15 minutes.`);
                    isPaused = true;
                    if (pauseTimeout) clearTimeout(pauseTimeout);
                    pauseTimeout = setTimeout(() => {
                        isPaused = false;
                        pauseTimeout = null;
                        logger.info(`Resuming normal telemetry generation.`);
                    }, 15 * 60 * 1000);
                }
            } catch (err) {
                logger.error(`Failed to parse REDIS msg: ${err}`);
            }
        });
    } catch (err) {
        logger.error(`Failed to connect Redis Subscriber: ${err}`);
    }
}
