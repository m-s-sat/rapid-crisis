import { Types } from "mongoose";

export interface staff_details{
    name: string;
    phoneNumber: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface guest_details{
    name: string;
    phoneNumber: string;
    room_no: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ai_response{
    _id?: Types.ObjectId;
    venue: Types.ObjectId;
    crisis: Types.ObjectId;
    confidence_score: number;
    status: "pending" | "active" | "resolved";
    zones?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface crisis{
    _id?: Types.ObjectId;
    type: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface venue{
    _id?: Types.ObjectId;
    name: string;
    type: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    email: string;
    staff_details: Map<string, staff_details>;
    guest_details: guest_details[];
    createdAt: Date;
    updatedAt: Date;
}