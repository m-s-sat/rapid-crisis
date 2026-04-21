import { Router } from "express";
import { getStatus, heartbeat, terminate } from "../controllers/simulator.controller.js";

const router = Router();

router.get("/status", getStatus);
router.post("/heartbeat", heartbeat);
router.post("/terminate", terminate);

export default router;
