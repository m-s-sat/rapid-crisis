import mongoose, { Schema, Document } from "mongoose";

export interface IAdmin extends Document {
    name: string;
    email: string;
    password_hash: string;
    venue_id: mongoose.Types.ObjectId;
    refresh_token?: string;
    created_at: Date;
}

const AdminSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    venue_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    refresh_token: { type: String },
    created_at: { type: Date, default: Date.now }
});

export default mongoose.model<IAdmin>("Admin", AdminSchema);
