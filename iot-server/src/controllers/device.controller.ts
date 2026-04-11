import type { Request, Response } from "express";
import { getDevices, generateReading } from "../services/sensor.service.js";

export function listDevices(_req: Request, res: Response): void {
    const devices = getDevices();
    res.json({
        success: true,
        count: devices.length,
        devices,
    });
}

export function getDeviceReading(req: Request, res: Response): void {
    const { deviceId } = req.params;
    const device = getDevices().find(d => d.device_id === deviceId);

    if (!device) {
        res.status(404).json({ success: false, message: `Device ${deviceId} not found` });
        return;
    }

    const reading = generateReading(device);
    res.json({ success: true, reading });
}

export function getAllReadings(_req: Request, res: Response): void {
    const devices = getDevices();
    const readings = devices.map(d => generateReading(d));
    res.json({
        success: true,
        count: readings.length,
        readings,
    });
}
