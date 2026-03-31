import express from 'express';
import morgan from 'morgan'
import cors from 'cors';
import { connectToPg } from './db/pg.js';
import { connectToRedis } from './db/redis.js';
import { env } from './config/env.js';
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import session from 'express-session';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(morgan('dev'));
app.use(cors());
app.use(session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
    }
}));

wss.on('connection', (ws) => {
    ws.on('error', console.error);
});

async function startServer() {
    try {
        const pgPool = await connectToPg();
        const redisClient = await connectToRedis();
        const subscriber = await connectToRedis();
        
        if (!pgPool || !redisClient || !subscriber) {
            console.error("Failed to connect to database or redis");
            process.exit(1);
        }

        await subscriber.subscribe('messaging_status', (message) => {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
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

