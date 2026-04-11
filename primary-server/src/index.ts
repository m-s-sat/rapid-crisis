import express from 'express';
import { createClient } from 'redis';
import morgan from 'morgan'
import cors from 'cors';
import { redisManagerInstance } from './db/redis.js';
import { env } from './config/env.js';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { mongoManagerInstance } from './db/mongo.js';
import mainRouter from './routes/index.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(session({
    secret: env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
    }
}));

interface CustomWebSocket extends WebSocket {
    venue_id?: string;
}

// Removing in-memory Map in favor of Redis caching

wss.on('connection', async (ws: CustomWebSocket, req) => {
    ws.on('error', console.error);
    
    try {
        const urlParams = new URL(req.url || '', `http://${req.headers.host}`);
        const venue_id = urlParams.searchParams.get('venue_id');
        if (venue_id) {
            ws.venue_id = venue_id;
            
            // Send cached crisis from Redis if it exists for this venue
            const redis = await redisManagerInstance.getClient();
            if (redis) {
                const cached = await redis.get(`active_crisis_cache:${venue_id}`);
                if (cached) {
                    ws.send(cached);
                }
            }
        }
    } catch (err) {
        console.error("Error parsing WS URL: ", err);
    }
});

export const activeTimeouts = new Map<string, NodeJS.Timeout>();



app.use('/api', mainRouter);

async function startServer() {
    try {
        const redisClient = await redisManagerInstance.init();
        const mongoClient = await mongoManagerInstance.init();

        if (!redisClient || !mongoClient) {
            console.error("Failed to connect to database or redis");
            process.exit(1);
        }

        const subscriberClient = createClient({
            url: typeof env.REDIS_URL === "string" ? env.REDIS_URL : JSON.stringify(env.REDIS_URL)
        });
        await subscriberClient.connect();

        await subscriberClient.subscribe('messaging_status', (message) => {
            try {
                const parsed = JSON.parse(message);
                const targetVenueId = parsed.venue_id;
                
                if (parsed.type === 'decided_by_admin' && parsed.payload && parsed.payload.crisis_details) {
                    const crisisId = parsed.payload.crisis_details._id || parsed.payload.crisis_details;
                    
                    // Cache the crisis in Redis for reconnecting clients (15 min expiry)
                    redisManagerInstance.getClient().then(redis => {
                        if (redis && targetVenueId) redis.set(`active_crisis_cache:${targetVenueId}`, message, { EX: 900 });
                    });

                    const timeoutId = setTimeout(async () => {
                        activeTimeouts.delete(crisisId);
                        
                        // Clear from Redis on expiry
                        const redis = await redisManagerInstance.getClient();
                        if (redis && targetVenueId) await redis.del(`active_crisis_cache:${targetVenueId}`);

                        wss.clients.forEach((client: any) => {
                            if (client.readyState === WebSocket.OPEN && client.venue_id === targetVenueId) {
                                client.send(JSON.stringify({
                                    type: 'expired',
                                    crisis_id: crisisId,
                                    venue_id: targetVenueId,
                                    message: "Decision window expired. Telemetry resuming."
                                }));
                            }
                        });
                    }, 15 * 60 * 1000);

                    activeTimeouts.set(crisisId, timeoutId);

                    wss.clients.forEach((client: any) => {
                        if (client.readyState === WebSocket.OPEN && (!targetVenueId || client.venue_id === targetVenueId)) {
                            client.send(message);
                            client.send(JSON.stringify({
                                type: 'pause_started',
                                venue_id: targetVenueId,
                                duration_ms: 15 * 60 * 1000
                            }));
                        }
                    });
                    return;
                }

                if (parsed.type === 'sent') {
                    redisManagerInstance.getClient().then(redis => {
                        if (redis && targetVenueId) redis.del(`active_crisis_cache:${targetVenueId}`);
                    });
                    wss.clients.forEach((client: any) => {
                        if (client.readyState === WebSocket.OPEN && (!targetVenueId || client.venue_id === targetVenueId)) {
                            client.send(JSON.stringify({
                                type: 'message_sent',
                                venue_id: targetVenueId,
                                message: 'Crisis alerts dispatched to all registered contacts.'
                            }));
                            client.send(JSON.stringify({
                                type: 'pause_started',
                                venue_id: targetVenueId,
                                duration_ms: 15 * 60 * 1000
                            }));
                        }
                    });
                    return;
                }

                if (parsed.type === 'resume') {
                    redisManagerInstance.getClient().then(redis => {
                        if (redis && targetVenueId) redis.del(`active_crisis_cache:${targetVenueId}`);
                    });
                    wss.clients.forEach((client: any) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'pause_ended' }));
                        }
                    });
                    return;
                }

                if (parsed.type === 'crisis_detected' || parsed.type === 'crisis_update') {
                    redisManagerInstance.getClient().then(redis => {
                        if (redis && targetVenueId) redis.set(`active_crisis_cache:${targetVenueId}`, message, { EX: 900 });
                    });
                }

                wss.clients.forEach((client: any) => {
                    if (client.readyState === WebSocket.OPEN && (!targetVenueId || client.venue_id === targetVenueId)) {
                        client.send(message);
                    }
                });
            } catch (err) {
                console.error("Error with pubsub message parsing:", err);
            }
        });

        await subscriberClient.subscribe('sensor_data', (message) => {
            try {
                const parsed = JSON.parse(message);
                wss.clients.forEach((client: any) => {
                    if (client.readyState === WebSocket.OPEN && client.venue_id === parsed.venue_id) {
                        client.send(JSON.stringify({
                            type: 'sensor_data',
                            payload: parsed.payload
                        }));
                    }
                });
            } catch (err) {
                console.error("Error with sensor_data pubsub:", err);
            }
        });

        const keyspaceClient = createClient({
            url: typeof env.REDIS_URL === "string" ? env.REDIS_URL : JSON.stringify(env.REDIS_URL)
        });
        await keyspaceClient.connect();

        await keyspaceClient.configSet("notify-keyspace-events", "Ex");
        await keyspaceClient.subscribe("__keyevent@0__:expired", (key) => {
            if (typeof key === "string" && key.startsWith("active_crisis:")) {
                const parts = key.split(":");
                const venueId = parts[1];
                const zone = parts[2];
                const crisisType = parts[3];
                console.log(`[AUTO-RESOLVE] ${crisisType}@${zone} (venue=${venueId}) — cooldown expired`);

                wss.clients.forEach((client: any) => {
                    if (client.readyState === WebSocket.OPEN && client.venue_id === venueId) {
                        client.send(JSON.stringify({
                            type: "crisis_resolved",
                            venue_id: venueId,
                            zone,
                            crisis_type: crisisType,
                            message: `${crisisType} crisis in ${zone} has been auto-resolved`,
                        }));
                    }
                });
            }
        });

        server.listen(env.PORT, () => {
            console.log(`Server is running on port ${env.PORT}`);
        });
    }
    catch (err: any) {
        console.error("Error starting server: ", err);
        process.exit(1);
    }
}

startServer();

