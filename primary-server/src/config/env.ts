import { configDotenv } from "dotenv";

configDotenv();

export const env = {
    PORT: process.env.PORT || "3000",
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    SESSION_SECRET: process.env.SESSION_SECRET || "default_secret_key",
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017",
}
