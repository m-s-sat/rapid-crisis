import { configDotenv } from "dotenv";

configDotenv();

export const env = {
    PORT: process.env.PORT || "3001",
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/google-solutions",
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "crisis_access_secret_2026",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "crisis_refresh_secret_2026",
}
