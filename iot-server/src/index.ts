import express from "express";
import { WebSocketServer } from "ws";
import { env } from "./config/env.js";
import { initDevices } from "./services/sensor.service.js";
import { startCronJobs } from "./cron/scheduler.js";
import { setRunning } from "./controllers/simulator.controller.js";
import { mongoManager } from "./db/mongo.js";
import deviceRoutes from "./routes/device.routes.js";
import simulatorRoutes from "./routes/simulator.routes.js";
import { logger } from "./utils/logger.js";
import { startRedisListener } from "./services/redis_listener.service.js";

const app = express();

app.use(express.json());

app.use("/api", deviceRoutes);
app.use("/api", simulatorRoutes);

export const wss = new WebSocketServer({ noServer: true });

async function boot() {
    await mongoManager.init();

    const devices = await initDevices();
    logger.info(`Initialized ${devices.length} simulated ESP32 devices`);
    
    await startRedisListener();

    startCronJobs();
    setRunning(true);

    const server = app.listen(env.PORT, () => {
        logger.success(`IoT simulator running on http://localhost:${env.PORT}`);
        logger.info("────────────────────────────────────────");
        logger.info("Endpoints:");
        logger.info("  GET  /api/status                  — health check");
        logger.info("  GET  /api/devices                 — list devices");
        logger.info("  GET  /api/devices/:id/reading     — single reading");
        logger.info("  GET  /api/readings                — all readings");
        logger.info("  POST /api/simulator/start          — start emission");
        logger.info("  POST /api/simulator/stop           — stop emission");
        logger.info("────────────────────────────────────────");
    });

    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
}

boot();
