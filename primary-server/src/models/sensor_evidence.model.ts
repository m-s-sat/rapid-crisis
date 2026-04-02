import { model, Schema } from "mongoose";

const sensorSnapshotSchema = new Schema({
    temperature_c: Number,
    humidity_pct: Number,
    smoke_ppm: Number,
    co_ppm: Number,
    co2_ppm: Number,
    gas_lpg_ppm: Number,
    gas_methane_ppm: Number,
    air_quality_index: Number,
    flame_detected: Boolean,
    motion_detected: Boolean,
    sound_db: Number,
    vibration_g: Number,
    water_level_cm: Number,
    moisture_detected: Boolean,
    door_open: Boolean,
}, { _id: false });

const mediaSchema = new Schema({
    photo: String,
    video: String,
    audio: String,
}, { _id: false });

const locationSchema = new Schema({
    zone: String,
    floor: Number,
    lat: Number,
    lng: Number,
}, { _id: false });

const sensorEvidenceSchema = new Schema({
    venue_id: { type: String, required: true, index: true },
    device_id: { type: String, required: true },
    device_mac: { type: String, required: true },
    timestamp: { type: String, required: true, index: true },
    location: locationSchema,
    sensors: sensorSnapshotSchema,
    media: mediaSchema,
}, { timestamps: true });

export const SensorEvidence = model("sensor_evidence", sensorEvidenceSchema);
