import { configDotenv } from "dotenv";

configDotenv();

export const env = {
    PORT: process.env.PORT,
    PG_USER: process.env.PG_USER,
    PG_HOST: process.env.PG_HOST,
    PG_DATABASE: process.env.PG_DATABASE,
    PG_PASSWORD: process.env.PG_PASSWORD,
    PG_PORT: process.env.PG_PORT,
    REDIS_URL: process.env.REDIS_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
}