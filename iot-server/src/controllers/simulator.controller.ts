import type { Request, Response } from "express";
import { refreshSession, terminateSession } from "../services/redis_listener.service.js";

let isRunning = false;

export function setRunning(status: boolean): void {
    isRunning = status;
}

export function getStatus(_req: Request, res: Response): void {
    res.json({
        success: true,
        running: isRunning,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
}

export function heartbeat(req: Request, res: Response): void {
    refreshSession();
    res.json({ success: true });
}

export function terminate(req: Request, res: Response): void {
    terminateSession();
    res.json({ success: true });
}
