import mongoose, { Schema, Document } from "mongoose";

export interface IGuest extends Document {
    name: string;
    room_id: string;
    phoneNumber: string;
    status: 'active' | 'checked_out';
    venue_id: mongoose.Types.ObjectId;
    checked_in_at: Date;
}

const GuestSchema: Schema = new Schema({
    name: { type: String, required: true },
    room_id: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    status: { 
        type: String, 
        required: true, 
        enum: ['active', 'checked_out'], 
        default: 'active' 
    },
    venue_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    checked_in_at: { type: Date, default: Date.now }
});

export default mongoose.model<IGuest>("Guest", GuestSchema);
