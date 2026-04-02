import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const VenueSchema = new mongoose.Schema({}, { strict: false });
export const Venue = mongoose.models.venue || mongoose.model("venue", VenueSchema, "venues");

class MongoManager {
    async init() {
        try {
            await mongoose.connect(env.MONGO_URI);
            logger.success(`Connected to MongoDB at ${env.MONGO_URI}`);
        } catch (error: any) {
            logger.error(`Failed to connect to MongoDB: ${error.message}`);
            throw error;
        }
    }
}

export const mongoManager = new MongoManager();
