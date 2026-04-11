import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { Venue, Admin } from "../db/mongo.js";
import { logger } from "../utils/logger.js";
import type { CrisisType, DeviceConfig, SensorReading, SensorSnapshot } from "../types/sensor.types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZONES = ["lobby", "kitchen", "hallway", "server_room", "parking_garage", "storage", "ballroom", "pool_deck"];
const FLOORS = [0, 1, 2, 3, 4, 5];
const FIRMWARE_VERSIONS = ["3.2.1", "3.2.0", "3.1.8", "3.0.5"];

function generateMac(): string {
    return "ESP:" + Array.from({ length: 5 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase()
    ).join(":");
}

function createDevices(count: number): DeviceConfig[] {
    return Array.from({ length: count }, (_, i) => ({
        device_id: `ESP32-${String(i + 1).padStart(3, "0")}`,
        device_mac: generateMac(),
        zone: ZONES[Math.floor(Math.random() * ZONES.length)]!,
        floor: FLOORS[Math.floor(Math.random() * FLOORS.length)]!,
        lat: 28.6139 + (Math.random() - 0.5) * 0.01,
        lng: 77.2090 + (Math.random() - 0.5) * 0.01,
    }));
}

function jitter(base: number, range: number): number {
    return +(base + (Math.random() - 0.5) * 2 * range).toFixed(2);
}

function ambientSensors(): SensorSnapshot {
    return {
        temperature_c: jitter(24, 3),
        humidity_pct: jitter(45, 10),
        smoke_ppm: jitter(5, 3),
        co_ppm: jitter(2, 1),
        co2_ppm: jitter(450, 50),
        gas_lpg_ppm: jitter(10, 5),
        gas_methane_ppm: jitter(3, 2),
        air_quality_index: jitter(30, 10),
        flame_detected: false,
        motion_detected: Math.random() > 0.6,
        sound_db: jitter(40, 8),
        vibration_g: jitter(0.02, 0.01),
        water_level_cm: 0,
        moisture_detected: false,
        door_open: Math.random() > 0.8,
    };
}

function fireSensors(): SensorSnapshot {
    return {
        temperature_c: jitter(85, 30),
        humidity_pct: jitter(15, 5),
        smoke_ppm: jitter(900, 200),
        co_ppm: jitter(150, 50),
        co2_ppm: jitter(2000, 500),
        gas_lpg_ppm: jitter(60, 20),
        gas_methane_ppm: jitter(10, 5),
        air_quality_index: jitter(250, 50),
        flame_detected: Math.random() > 0.15,
        motion_detected: Math.random() > 0.3,
        sound_db: jitter(85, 10),
        vibration_g: jitter(0.3, 0.15),
        water_level_cm: 0,
        moisture_detected: false,
        door_open: Math.random() > 0.5,
    };
}

function gasLeakSensors(): SensorSnapshot {
    return {
        temperature_c: jitter(24, 3),
        humidity_pct: jitter(45, 10),
        smoke_ppm: jitter(15, 8),
        co_ppm: jitter(120, 40),
        co2_ppm: jitter(1200, 300),
        gas_lpg_ppm: jitter(350, 100),
        gas_methane_ppm: jitter(180, 50),
        air_quality_index: jitter(200, 40),
        flame_detected: false,
        motion_detected: Math.random() > 0.5,
        sound_db: jitter(55, 10),
        vibration_g: jitter(0.03, 0.01),
        water_level_cm: 0,
        moisture_detected: false,
        door_open: Math.random() > 0.7,
    };
}

function earthquakeSensors(): SensorSnapshot {
    return {
        temperature_c: jitter(24, 3),
        humidity_pct: jitter(45, 10),
        smoke_ppm: jitter(8, 4),
        co_ppm: jitter(3, 1),
        co2_ppm: jitter(500, 80),
        gas_lpg_ppm: jitter(12, 5),
        gas_methane_ppm: jitter(5, 3),
        air_quality_index: jitter(40, 15),
        flame_detected: false,
        motion_detected: true,
        sound_db: jitter(75, 15),
        vibration_g: jitter(0.8, 0.4),
        water_level_cm: 0,
        moisture_detected: false,
        door_open: Math.random() > 0.3,
    };
}

function securitySensors(): SensorSnapshot {
    return {
        temperature_c: jitter(23, 3),
        humidity_pct: jitter(48, 8),
        smoke_ppm: jitter(4, 2),
        co_ppm: jitter(1, 0.5),
        co2_ppm: jitter(480, 50),
        gas_lpg_ppm: jitter(7, 3),
        gas_methane_ppm: jitter(3, 2),
        air_quality_index: jitter(35, 10),
        flame_detected: false,
        motion_detected: true,
        sound_db: jitter(88, 12),
        vibration_g: jitter(0.25, 0.1),
        water_level_cm: 0,
        moisture_detected: false,
        door_open: true,
    };
}

function waterLeakSensors(): SensorSnapshot {
    return {
        temperature_c: jitter(22, 3),
        humidity_pct: jitter(92, 5),
        smoke_ppm: jitter(4, 2),
        co_ppm: jitter(2, 1),
        co2_ppm: jitter(460, 50),
        gas_lpg_ppm: jitter(8, 3),
        gas_methane_ppm: jitter(3, 2),
        air_quality_index: jitter(35, 10),
        flame_detected: false,
        motion_detected: Math.random() > 0.6,
        sound_db: jitter(50, 10),
        vibration_g: jitter(0.03, 0.01),
        water_level_cm: jitter(8, 4),
        moisture_detected: true,
        door_open: Math.random() > 0.7,
    };
}

function airQualitySensors(): SensorSnapshot {
    return {
        temperature_c: jitter(26, 3),
        humidity_pct: jitter(55, 10),
        smoke_ppm: jitter(40, 15),
        co_ppm: jitter(45, 15),
        co2_ppm: jitter(1800, 400),
        gas_lpg_ppm: jitter(30, 10),
        gas_methane_ppm: jitter(15, 8),
        air_quality_index: jitter(220, 60),
        flame_detected: false,
        motion_detected: Math.random() > 0.5,
        sound_db: jitter(42, 8),
        vibration_g: jitter(0.02, 0.01),
        water_level_cm: 0,
        moisture_detected: false,
        door_open: Math.random() > 0.7,
    };
}

const SENSOR_GENERATORS: Record<CrisisType, () => SensorSnapshot> = {
    fire: fireSensors,
    gas_leak: gasLeakSensors,
    earthquake: earthquakeSensors,
    security: securitySensors,
    water_leak: waterLeakSensors,
    air_quality: airQualitySensors,
    other: ambientSensors,
};

// const PHOTO_FILE_PATH = path.join(__dirname, "../../../ai/fire_crisis_scene_base64_with_prefix.txt");
let DUMMY_PHOTO = "";

/*
try {
    if (fs.existsSync(PHOTO_FILE_PATH)) {
        DUMMY_PHOTO = fs.readFileSync(PHOTO_FILE_PATH, "utf8").trim();
        logger.info(`Successfully loaded high-res photo from ${PHOTO_FILE_PATH} (${(DUMMY_PHOTO.length / 1024 / 1024).toFixed(2)} MB)`);
    } else {
        logger.warn(`Photo file not found at ${PHOTO_FILE_PATH}. Using empty string.`);
    }
} catch (err: any) {
    logger.error(`Error reading high-res photo: ${err.message}`);
}
*/

const PROFILE_WEIGHTS: { profile: CrisisType; weight: number }[] = [
    { profile: "fire", weight: 1.0 },
];

function pickSensorProfile(): CrisisType {
    const roll = Math.random();
    let cumulative = 0;
    for (const entry of PROFILE_WEIGHTS) {
        cumulative += entry.weight;
        if (roll <= cumulative) return entry.profile;
    }
    return "other";
}

import { setPauseVenueId } from "./redis_listener.service.js";



let venueId: string = "";

export async function fetchVenueFromDb() {
    try {
        const admin = await Admin.findOne({});
        if (admin && admin.venue_id) {
            venueId = admin.venue_id.toString();
            setPauseVenueId(venueId);
            logger.info(`Locked IoT Sandbox to venue_id: ${venueId} (via Admin Account ${admin.email || admin.name || 'Unknown'})`);
        } else {
            logger.warn("No admin found. Falling back to naive venue discovery...");
            const venue = await Venue.findOne({});
            if (venue) {
                venueId = venue._id.toString();
                setPauseVenueId(venueId);
                logger.info(`Latched onto naive venue_id: ${venueId}`);
            } else {
                logger.warn("No venue or admin found in DB");
            }
        }
    } catch (err: any) {
        logger.error("Failed to fetch primary configuration from DB: " + err.message);
    }
}

let devices: DeviceConfig[] = [];
const deviceUptimes = new Map<string, number>();

export async function initDevices(): Promise<DeviceConfig[]> {
    await fetchVenueFromDb();
    devices = createDevices(env.NUM_DEVICES);
    const startTime = Date.now();
    for (const d of devices) {
        deviceUptimes.set(d.device_id, startTime);
    }
    return devices;
}

export function getDevices(): DeviceConfig[] {
    return devices;
}

export function getVenueId(): string {
    return venueId;
}

export function generateReading(device: DeviceConfig): { reading: SensorReading; profile: CrisisType } {
    const profile = pickSensorProfile();
    const sensors = SENSOR_GENERATORS[profile]();
    const bootTime = deviceUptimes.get(device.device_id) || Date.now();

    const reading: SensorReading = {
        device_id: device.device_id,
        device_mac: device.device_mac,
        firmware_version: FIRMWARE_VERSIONS[Math.floor(Math.random() * FIRMWARE_VERSIONS.length)]!,
        timestamp: new Date().toISOString(),
        uptime_ms: Date.now() - bootTime,
        battery_level: +(85 + Math.random() * 15).toFixed(1),
        wifi_rssi: Math.floor(-30 - Math.random() * 40),
        venue_id: venueId,
        sensors,
        location: {
            zone: device.zone,
            floor: device.floor,
            lat: device.lat,
            lng: device.lng,
        },
        media: {
            photo: DUMMY_PHOTO,
            video: "",
            audio: "",
        },
    };

    return { reading, profile };
}
