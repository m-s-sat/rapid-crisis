import type { Request, Response } from "express";
import { startCronJobs, stopCronJobs } from "../cron/scheduler.js";
import { logger } from "../utils/logger.js";

let isRunning = false;

export function getStatus(_req: Request, res: Response): void {
    res.json({
        success: true,
        simulator: isRunning ? "running" : "stopped",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
}

export function startSimulator(_req: Request, res: Response): void {
    if (isRunning) {
        res.json({ success: false, message: "Simulator is already running" });
        return;
    }
    startCronJobs();
    isRunning = true;
    logger.success("Simulator started via API");
    res.json({ success: true, message: "Simulator started" });
}

export function stopSimulator(_req: Request, res: Response): void {
    if (!isRunning) {
        res.json({ success: false, message: "Simulator is not running" });
        return;
    }
    stopCronJobs();
    isRunning = false;
    logger.warn("Simulator stopped via API");
    res.json({ success: true, message: "Simulator stopped" });
}

export function setRunning(state: boolean): void {
    isRunning = state;
}
