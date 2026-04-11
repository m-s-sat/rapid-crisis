import mongoose, { Schema, Document } from "mongoose";

export interface IStaff extends Document {
    name: string;
    phoneNumber: string;
    expertise: 'fire' | 'security' | 'medical' | 'all';
    venue_id: mongoose.Types.ObjectId;
}

const StaffSchema: Schema = new Schema({
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    expertise: { 
        type: String, 
        required: true, 
        enum: ['fire', 'security', 'medical', 'all'] 
    },
    venue_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true }
});

export default mongoose.model<IStaff>("Staff", StaffSchema);
