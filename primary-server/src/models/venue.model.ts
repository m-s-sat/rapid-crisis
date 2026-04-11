import mongoose, { Schema, Document } from "mongoose";

export interface IVenue extends Document {
    name: string;
    location: string;
    hospitality_type: 'Hotel' | 'Hospital' | 'Resort' | 'Resort & Spa' | 'Shopping Mall' | 'Other';
    contact_number: string;
    created_at: Date;
}

const VenueSchema: Schema = new Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    hospitality_type: { 
        type: String, 
        required: true, 
        enum: ['Hotel', 'Hospital', 'Resort', 'Resort & Spa', 'Shopping Mall', 'Other'] 
    },
    contact_number: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

export default mongoose.model<IVenue>("Venue", VenueSchema);
