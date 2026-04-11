export interface aiResponse{
    crisis_type: string;
    confidence_score: number;
    venue_type: string;
    venue_name: string;
}

export interface pgSaveData{
    id: string;
    crisis_type: string;
    confidence_score: number;
    vernue_type: string;
    venue_name: string;
    guests: guestDetails[];
    messages_status: string;
    created_at: Date;
    updated_at: Date;
}

export interface guestDetails{
    name: string;
    phoneNumber: string;
}