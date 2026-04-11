import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { mongoManagerInstance } from './db/mongo.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: "Too many requests from this IP, please try again later." },
});
app.use(globalLimiter);

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true
}));

app.use('/api/auth', authRoutes);

async function startServer() {
    try {
        const mongoClient = await mongoManagerInstance.init();

        if (!mongoClient) {
            console.error("Failed to connect to database");
            process.exit(1);
        }

        app.listen(env.PORT, () => {
            console.log(`Auth Server is running on port ${env.PORT}`);
        });
    }
    catch (err: any) {
        console.error("Error starting server: ", err);
        process.exit(1);
    }
}

startServer();
