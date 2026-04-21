import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { env } from "./config/env.js";
import { initDevices } from "./services/sensor.service.js";
import { startCronJobs } from "./cron/scheduler.js";
import { setRunning } from "./controllers/simulator.controller.js";
import { mongoManager } from "./db/mongo.js";
import deviceRoutes from "./routes/device.routes.js";
import simulatorRoutes from "./routes/simulator.routes.js";
import { logger } from "./utils/logger.js";
import { startRedisListener, getPauseState, getPauseRemainingMs } from "./services/redis_listener.service.js";
import { getLastSensorPayload } from "./services/transmitter.service.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", deviceRoutes);
app.use("/api/simulator", simulatorRoutes);

export const wss = new WebSocketServer({ noServer: true });

wss.on("connection", async (ws, req) => {
    let venue_id: string | undefined;
    try {
        const urlParams = new URL(req.url || '', `http://${req.headers.host}`);
        venue_id = urlParams.searchParams.get('venue_id') || undefined;
    } catch (e) {
        logger.error("WS parse error");
    }

    const lastPayload = await getLastSensorPayload(venue_id);
    if (lastPayload) {
        ws.send(JSON.stringify({ type: "sensor_data", payload: lastPayload }));
    }

    if (getPauseState()) {
        const remaining = getPauseRemainingMs();
        if (remaining > 0) {
            ws.send(JSON.stringify({ type: "telemetry_paused", duration_ms: remaining }));
        }
    }
});

async function boot() {
    await mongoManager.init();

    const devices = await initDevices();
    logger.info(`Initialized ${devices.length} devices`);
    
    await startRedisListener();

    startCronJobs();
    setRunning(true);

    const server = app.listen(env.PORT, () => {
        logger.success(`IoT simulator running on port ${env.PORT}`);
    });

    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
}

boot();
