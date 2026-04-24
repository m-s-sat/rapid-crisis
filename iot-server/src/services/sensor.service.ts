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

const deviceStates = new Map<string, SensorSnapshot>();
const deviceUptimes = new Map<string, number>();
let devices: DeviceConfig[] = [];
let venueId: string = "";
let DUMMY_PHOTO = "";

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

function drift(current: number, min: number, max: number, noise: number): number {
    const change = (Math.random() - 0.5) * noise;
    let next = current + change;
    if (next < min) next = min + Math.random() * noise;
    if (next > max) next = max - Math.random() * noise;
    return +next.toFixed(2);
}

function getInitialAmbient(): SensorSnapshot {
    return {
        temperature_c: 32,
        humidity_pct: 45,
        smoke_ppm: 5,
        co_ppm: 2,
        co2_ppm: 450,
        gas_lpg_ppm: 10,
        gas_methane_ppm: 3,
        air_quality_index: 30,
        flame_detected: false,
        motion_detected: false,
        sound_db: 40,
        vibration_g: 0.02,
        water_level_cm: 0,
        moisture_detected: false,
        door_open: false,
    };
}

const CRISIS_TARGETS: Record<CrisisType, Partial<SensorSnapshot>> = {
    fire: { temperature_c: 85, smoke_ppm: 900, co_ppm: 150, flame_detected: true, sound_db: 85 },
    gas_leak: { gas_lpg_ppm: 400, gas_methane_ppm: 200, co_ppm: 120, air_quality_index: 200 },
    earthquake: { vibration_g: 1.2, sound_db: 80, motion_detected: true },
    security: { motion_detected: true, door_open: true, sound_db: 90 },
    water_leak: { water_level_cm: 10, moisture_detected: true, humidity_pct: 95 },
    air_quality: { air_quality_index: 250, co2_ppm: 2200 },
    other: {}
};

function moveTowards(current: number, target: number, step: number): number {
    if (current < target) return +(current + step).toFixed(2);
    if (current > target) return +(current - step).toFixed(2);
    return current;
}

import { setPauseVenueId } from "./redis_listener.service.js";

export async function fetchVenueFromDb() {
    try {
        const admin = await Admin.findOne({});
        if (admin && admin.venue_id) {
            venueId = admin.venue_id.toString();
            setPauseVenueId(venueId);
        } else {
            const venue = await Venue.findOne({});
            if (venue) {
                venueId = venue._id.toString();
                setPauseVenueId(venueId);
            }
        }
    } catch (err: any) {
        logger.error("DB Fetch Error: " + err.message);
    }
}

export async function initDevices(): Promise<DeviceConfig[]> {
    await fetchVenueFromDb();
    devices = createDevices(env.NUM_DEVICES);
    const startTime = Date.now();
    for (const d of devices) {
        deviceUptimes.set(d.device_id, startTime);
        deviceStates.set(d.device_id, getInitialAmbient());
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
    const bootTime = deviceUptimes.get(device.device_id) || Date.now();
    const elapsedSeconds = (Date.now() - bootTime) / 1000;

    let state = deviceStates.get(device.device_id) || getInitialAmbient();
    const roll = Math.random();
    let profile: CrisisType = "other";

    if (roll < 0.005) profile = "fire";
    else if (roll < 0.007) profile = "gas_leak";
    else if (roll < 0.009) profile = "earthquake";
    else if (roll < 0.011) profile = "security";
    else if (roll < 0.013) profile = "water_leak";
    else if (roll < 0.015) profile = "air_quality";

    const targets = CRISIS_TARGETS[profile];

    const newState: SensorSnapshot = {
        temperature_c: profile !== "other" && targets.temperature_c ? moveTowards(state.temperature_c, targets.temperature_c, 5) : drift(state.temperature_c, elapsedSeconds < 30 ? 30 : 46, elapsedSeconds < 30 ? 40 : 50, 0.5),
        humidity_pct: profile !== "other" && targets.humidity_pct ? moveTowards(state.humidity_pct, targets.humidity_pct, 2) : drift(state.humidity_pct, 30, 60, 0.5),
        smoke_ppm: profile !== "other" && targets.smoke_ppm ? moveTowards(state.smoke_ppm, targets.smoke_ppm, 50) : drift(state.smoke_ppm, 0, 20, 1),
        co_ppm: profile !== "other" && targets.co_ppm ? moveTowards(state.co_ppm, targets.co_ppm, 10) : drift(state.co_ppm, 0, 10, 0.5),
        co2_ppm: profile !== "other" && targets.co2_ppm ? moveTowards(state.co2_ppm, targets.co2_ppm, 100) : drift(state.co2_ppm, 400, 600, 5),
        gas_lpg_ppm: profile !== "other" && targets.gas_lpg_ppm ? moveTowards(state.gas_lpg_ppm, targets.gas_lpg_ppm, 20) : drift(state.gas_lpg_ppm, 0, 15, 0.5),
        gas_methane_ppm: profile !== "other" && targets.gas_methane_ppm ? moveTowards(state.gas_methane_ppm, targets.gas_methane_ppm, 10) : drift(state.gas_methane_ppm, 0, 10, 0.5),
        air_quality_index: profile !== "other" && targets.air_quality_index ? moveTowards(state.air_quality_index, targets.air_quality_index, 10) : drift(state.air_quality_index, 10, 50, 1),
        flame_detected: profile === "fire" ? (state.temperature_c > 50 ? true : false) : false,
        motion_detected: profile === "security" || profile === "earthquake" || Math.random() > 0.9,
        sound_db: profile !== "other" && targets.sound_db ? moveTowards(state.sound_db, targets.sound_db, 5) : drift(state.sound_db, 30, 50, 2),
        vibration_g: profile !== "other" && targets.vibration_g ? moveTowards(state.vibration_g, targets.vibration_g, 0.1) : drift(state.vibration_g, 0, 0.05, 0.01),
        water_level_cm: profile === "water_leak" ? moveTowards(state.water_level_cm, targets.water_level_cm || 0, 1) : 0,
        moisture_detected: profile === "water_leak",
        door_open: profile === "security" || (profile === "other" && Math.random() > 0.95),
    };

    deviceStates.set(device.device_id, newState);

    let effectiveProfile: CrisisType = "other";
    if (newState.temperature_c > 45 || newState.smoke_ppm > 351 || newState.flame_detected) {
        effectiveProfile = "fire";
    }

    // bootTime already calculated at the top
    const reading: SensorReading = {
        device_id: device.device_id,
        device_mac: device.device_mac,
        firmware_version: FIRMWARE_VERSIONS[Math.floor(Math.random() * FIRMWARE_VERSIONS.length)]!,
        timestamp: new Date().toISOString(),
        uptime_ms: Date.now() - bootTime,
        battery_level: +(85 + Math.random() * 15).toFixed(1),
        wifi_rssi: Math.floor(-30 - Math.random() * 40),
        venue_id: venueId,
        sensors: newState,
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

    return { reading, profile: effectiveProfile };
}
