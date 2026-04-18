import { configDotenv } from "dotenv";

configDotenv();

export const env = {
    PORT: process.env.PORT || "4000",
    PRIMARY_SERVER_URL: process.env.PRIMARY_SERVER_URL || "http://localhost:3002",
    CRON_INTERVAL_SECONDS: parseInt(process.env.CRON_INTERVAL_SECONDS || "30", 10), // Increased for AI quota
    NUM_DEVICES: parseInt(process.env.NUM_DEVICES || "1", 10),
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/google-solutions",
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
};
