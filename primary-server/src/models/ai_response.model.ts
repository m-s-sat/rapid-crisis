import { model, Schema } from "mongoose";
import type { ai_response, venue, guest_details, crisis } from "../schema/ai_response.interface.js";

const aiResponseSchema = new Schema<ai_response>({
    venue: {
        type: Schema.Types.ObjectId,
        ref: "venue"
    },
    crisis: {
        type: Schema.Types.ObjectId,
        ref: "crisis_type"
    },
    confidence_score: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'resolved'],
        default: 'active'
    },
    zones: [{
        type: String
    }]
}, { timestamps: true });

export const crisisSchema = new Schema<crisis>({
    type: {
        type: String,
        enum: ["fire", "gas_leak", "earthquake", "security", "water_leak", "air_quality", "other"],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true})

export const guestSchema = new Schema<guest_details>({
    name: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    room_no: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true, _id: false })

export const venueSchema = new Schema<venue>({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    zip: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    staff_details: {
        type: Map,
        enum: ["fire", "gas_leak", "earthquake", "security", "water_leak", "air_quality"],
        of: {
            name: {
                type: String,
                required: true
            },
            phoneNumber: {
                type: String,
                required: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            },
            updatedAt: {
                type: Date,
                default: Date.now
            }
        }
    },
    guest_details: {
        type: [guestSchema],
        default: []
    }
}, { timestamps: true })

export const crisisModel = model<crisis>("crisis_type", crisisSchema);
export const venueModel = model<venue>("venue", venueSchema);
export const AiResponse = model<ai_response>("ai_response", aiResponseSchema);