import { configDotenv } from "dotenv";

configDotenv();

const getEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment variable ${key} is not set`);
    }
    return value;
};

export const env = {
    TWILIO_ACCOUNT_SID: getEnv("TWILIO_ACCOUNT_SID"),
    TWILIO_AUTH_TOKEN: getEnv("TWILIO_AUTH_TOKEN"),
    TWILIO_PHONE_NUMBER: getEnv("TWILIO_PHONE_NUMBER"),
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    PG_USER: process.env.PG_USER || "postgres",
    PG_HOST: process.env.PG_HOST || "localhost",
    PG_DATABASE: process.env.PG_DATABASE || "crisis_db",
    PG_PASSWORD: process.env.PG_PASSWORD || "password",
    PG_PORT: process.env.PG_PORT || "5432",
}
