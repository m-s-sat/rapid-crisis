export interface SensorSnapshot {
    temperature_c: number;
    humidity_pct: number;
    smoke_ppm: number;
    co_ppm: number;
    co2_ppm: number;
    gas_lpg_ppm: number;
    gas_methane_ppm: number;
    air_quality_index: number;
    flame_detected: boolean;
    motion_detected: boolean;
    sound_db: number;
    vibration_g: number;
    water_level_cm: number;
    moisture_detected: boolean;
    door_open: boolean;
}

export interface MediaCapture {
    photo: string;
    video: string;
    audio: string;
}

export interface CrisisEvidencePayload {
    venue_id: string;
    device_id: string;
    device_mac: string;
    timestamp: string;
    location: {
        zone: string;
        floor: number;
        lat: number;
        lng: number;
    };
    sensors: SensorSnapshot;
    media: MediaCapture;
}

export type CrisisType = "fire" | "gas_leak" | "earthquake" | "security" | "water_leak" | "air_quality";

export interface AiClassificationResult {
    crisis_detected: boolean;
    crisis_type?: CrisisType;
    confidence_score?: number;
    zones?: string[];
}
