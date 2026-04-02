import cron from "node-cron";
import { env } from "../config/env.js";
import { getDevices, generateReading } from "../services/sensor.service.js";
import { transmitReading } from "../services/transmitter.service.js";
import { logger } from "../utils/logger.js";

let activeTasks: cron.ScheduledTask[] = [];

export function startCronJobs(): void {
    const devices = getDevices();
    const intervalSec = env.CRON_INTERVAL_SECONDS;
    const cronExpression = `*/${intervalSec} * * * * *`;

    logger.info(`Scheduling ${devices.length} devices every ${intervalSec}s — cron: "${cronExpression}"`);

    for (const device of devices) {
        const staggerMs = Math.floor(Math.random() * 2000);

        const task = cron.schedule(cronExpression, () => {
            setTimeout(async () => {
                const reading = generateReading(device);
                await transmitReading(reading);
            }, staggerMs);
        });

        activeTasks.push(task);
        logger.info(`Registered device ${device.device_id} | zone=${device.zone} floor=${device.floor} stagger=${staggerMs}ms`);
    }
}

export function stopCronJobs(): void {
    for (const task of activeTasks) {
        task.stop();
    }
    activeTasks = [];
    logger.info("All cron jobs stopped");
}
