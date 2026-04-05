import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { env } from './config/env.js';
import { mongoManagerInstance } from './db/mongo.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

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
