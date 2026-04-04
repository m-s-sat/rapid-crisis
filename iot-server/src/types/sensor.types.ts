export type CrisisType = "fire" | "gas_leak" | "earthquake" | "security" | "water_leak" | "air_quality" | "other";

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

export interface SensorReading {
    device_id: string;
    device_mac: string;
    firmware_version: string;
    timestamp: string;
    uptime_ms: number;
    battery_level: number;
    wifi_rssi: number;
    venue_id: string;
    sensors: SensorSnapshot;
    location: {
        zone: string;
        floor: number;
        lat: number;
        lng: number;
    };
    media?: MediaCapture;
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

export interface DeviceConfig {
    device_id: string;
    device_mac: string;
    zone: string;
    floor: number;
    lat: number;
    lng: number;
}
