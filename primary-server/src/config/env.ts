import { configDotenv } from "dotenv";

configDotenv();

export const env = {
    PORT: process.env.PORT || "3000",
    PG_USER: process.env.PG_USER || "postgres",
    PG_HOST: process.env.PG_HOST || "localhost",
    PG_DATABASE: process.env.PG_DATABASE || "crisis_db",
    PG_PASSWORD: process.env.PG_PASSWORD || "password",
    PG_PORT: process.env.PG_PORT || "5432",
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    SESSION_SECRET: process.env.SESSION_SECRET || "default_secret_key",
}