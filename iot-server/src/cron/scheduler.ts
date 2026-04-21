import { getDevices, generateReading } from "../services/sensor.service.js";
import { transmitReading } from "../services/transmitter.service.js";
import { logger } from "../utils/logger.js";
import { getPauseState, isSessionActive } from "../services/redis_listener.service.js";

let isRunning = false;
const deviceTimeouts = new Map<string, NodeJS.Timeout>();

async function poll(device: any) {
    if (!isRunning) return;

    const active = await isSessionActive();
    if (!active) {
        const timeout = setTimeout(() => poll(device), 5000);
        deviceTimeouts.set(device.device_id, timeout);
        return;
    }

    if (getPauseState()) {
        const timeout = setTimeout(() => poll(device), 10000);
        deviceTimeouts.set(device.device_id, timeout);
        return;
    }

    const { reading } = generateReading(device);
    await transmitReading(reading);

    const timeout = setTimeout(() => poll(device), 1000);
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
}
