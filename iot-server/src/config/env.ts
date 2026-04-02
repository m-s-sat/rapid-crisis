import { configDotenv } from "dotenv";

configDotenv();

export const env = {
    PORT: process.env.PORT || "4000",
    PRIMARY_SERVER_URL: process.env.PRIMARY_SERVER_URL || "http://localhost:3000",
    CRON_INTERVAL_SECONDS: parseInt(process.env.CRON_INTERVAL_SECONDS || "10", 10),
    NUM_DEVICES: parseInt(process.env.NUM_DEVICES || "3", 10),
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017",
};
