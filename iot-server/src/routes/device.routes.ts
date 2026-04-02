import { Router } from "express";
import { listDevices, getDeviceReading, getAllReadings } from "../controllers/device.controller.js";

const router = Router();

router.get("/devices", listDevices);
router.get("/devices/:deviceId/reading", getDeviceReading);
router.get("/readings", getAllReadings);

export default router;
