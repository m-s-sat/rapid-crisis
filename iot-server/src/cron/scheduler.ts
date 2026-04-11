import { getDevices, generateReading } from "../services/sensor.service.js";
import { transmitReading } from "../services/transmitter.service.js";
import { logger } from "../utils/logger.js";

let isRunning = false;
const deviceTimeouts = new Map<string, NodeJS.Timeout>();

import { getPauseState } from "../services/redis_listener.service.js";

async function poll(device: any) {
    if (!isRunning) return;

    if (getPauseState()) {
        const timeout = setTimeout(() => poll(device), 10000); // Check again in 10s if paused
        deviceTimeouts.set(device.device_id, timeout);
        return;
    }

    const { reading, profile } = generateReading(device);

    await transmitReading(reading);

    const delay = 1000; // Always poll constantly at <40% confidence.

    const timeout = setTimeout(() => poll(device), delay);
    deviceTimeouts.set(device.device_id, timeout);
}

export function startCronJobs(): void {
    if (isRunning) return;
    isRunning = true;
    const devices = getDevices();
    for (const device of devices) {
        poll(device);
    }
}

export function stopCronJobs(): void {
    isRunning = false;
    for (const timeout of deviceTimeouts.values()) {
        clearTimeout(timeout);
    }
    deviceTimeouts.clear();
    logger.info("Adaptive polling stopped");
}
