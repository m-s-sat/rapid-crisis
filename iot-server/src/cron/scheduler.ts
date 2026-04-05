import { getDevices, generateReading } from "../services/sensor.service.js";
import { transmitReading } from "../services/transmitter.service.js";
import { logger } from "../utils/logger.js";

let isRunning = false;
const deviceTimeouts = new Map<string, NodeJS.Timeout>();

async function poll(device: any) {
    if (!isRunning) return;

    const { reading, profile } = generateReading(device);
    const isCrisis = profile !== "other";

    await transmitReading(reading);

    const delay = isCrisis ? 15 * 60 * 1000 : 1000;

    if (isCrisis) {
        logger.success(`[ADAPTIVE] ${device.device_id} detected ${profile.toUpperCase()}. pausing for 15m.`);
    } else {
        logger.info(`[ADAPTIVE] ${device.device_id} is normal. polling in 1s.`);
    }

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
