import mongoose, { type Model, type Connection } from "mongoose";
import { env } from "../config/env.js";

class mongoManager {
    private connection: Connection | null = null;

    async init() {
        try {
            await mongoose.connect(env.MONGO_URI);
            this.connection = mongoose.connection;
            console.log("Connected to MongoDB via Mongoose");
            return this.connection;
        }
        catch (err: any) {
            console.error("Error connecting to mongo: ", err);
            return null;
        }
    }

    getModel<T>(modelName: string): Model<T> | null {
        if (!this.connection) {
            console.error("Connection not established");
            return null;
        }
        
        try {
            if (mongoose.models[modelName]) {
                return mongoose.models[modelName] as Model<T>;
            }
            else {
                console.error(`Model '${modelName}' not found. Make sure it is registered (e.g., by importing its file).`);
                return null;
            }
        }
        catch (err: any) {
            console.error(`Error fetching model ${modelName}:`, err);
            return null;
        }
    }
}

export const mongoManagerInstance = new mongoManager();
