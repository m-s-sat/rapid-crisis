import { Router } from "express";
import { getStatus, startSimulator, stopSimulator } from "../controllers/simulator.controller.js";

const router = Router();

router.get("/status", getStatus);
router.post("/simulator/start", startSimulator);
router.post("/simulator/stop", stopSimulator);

export default router;
