# Hospitality Crisis Types & Sensor Parameters

## Context

This is for a **Google Solutions Hackathon** project. The system detects crises in hospitality venues (hotels, resorts, convention centers), classifies them using Gemini/GenAI, notifies the relevant staff to respond, and messages guests with safety instructions.

**Architecture**: Each ESP32 device in a zone reads ALL its sensors simultaneously and sends ONE combined snapshot. The AI receives the full picture + media (laptop camera/mic/video) and decides what's happening.

---

## Crisis Types for Hospitality

Below are crises that realistically occur in hotels, resorts, and convention centers, along with which sensors detect them.

| # | Crisis Type | Description | Severity |
|---|------------|-------------|----------|
| 1 | **Fire** | Active fire or high fire risk | 🔴 Critical |
| 2 | **Gas Leak** | LPG, natural gas, or CO buildup | 🔴 Critical |
| 3 | **Earthquake** | Seismic activity / structural shaking | 🔴 Critical |
| 4 | **Flood / Water Leak** | Water pipe burst, flooding, rising water level | 🟠 High |
| 5 | **Security Breach** | Unauthorized intrusion, break-in, violence | 🟠 High |
| 6 | **Medical Emergency** | Guest collapse, cardiac event, unresponsive person | 🟠 High |
| 7 | **Electrical Hazard** | Short circuit, sparking, overheating wiring | 🟠 High |
| 8 | **Structural Damage** | Ceiling/wall crack, pillar stress (post-quake) | 🟡 Medium |
| 9 | **Air Quality / Toxic Fume** | Chemical spill, pool chemical leak, kitchen fumes | 🟡 Medium |
| 10 | **Stampede / Crowd Panic** | Mass panic in lobby/ballroom/event area | 🔴 Critical |

---

## Sensor Parameters Per Crisis

### 1. 🔥 Fire

| Sensor | Parameter | Unit | Normal Range | Crisis Threshold |
|--------|-----------|------|-------------|-----------------|
| DHT22/BME280 | `temperature_c` | °C | 18–30 | > 60 |
| DHT22/BME280 | `humidity_pct` | % | 30–60 | < 15 (dry heat) |
| MQ-2 | `smoke_ppm` | ppm | 0–20 | > 200 |
| MQ-7 | `co_ppm` | ppm | 0–10 | > 50 |
| MQ-2 | `gas_lpg_ppm` | ppm | 0–15 | > 100 |
| IR Flame | `flame_detected` | bool | false | true |

**AI media cues**: Camera sees orange/red glow, thick smoke. Audio picks up fire crackling, alarm sounds.

---

### 2. 💨 Gas Leak

| Sensor | Parameter | Unit | Normal Range | Crisis Threshold |
|--------|-----------|------|-------------|-----------------|
| MQ-2 | `gas_lpg_ppm` | ppm | 0–15 | > 200 |
| MQ-135 | `gas_methane_ppm` | ppm | 0–5 | > 100 |
| MQ-7 | `co_ppm` | ppm | 0–10 | > 100 |
| MQ-135 | `air_quality_index` | AQI | 0–50 | > 150 |
| DHT22 | `temperature_c` | °C | 18–30 | normal (no temp spike) |

**AI media cues**: Audio may detect hissing sound. Camera may show distortion from gas fumes.

---

### 3. 🌍 Earthquake

| Sensor | Parameter | Unit | Normal Range | Crisis Threshold |
|--------|-----------|------|-------------|-----------------|
| MPU6050 | `vibration_g` | g | 0–0.05 | > 0.3 |
| MPU6050 | `acceleration_x` | m/s² | ~0 | > 2.0 |
| MPU6050 | `acceleration_y` | m/s² | ~0 | > 2.0 |
| MPU6050 | `acceleration_z` | m/s² | ~9.8 | deviation > 2.0 |
| Tilt | `tilt_angle_deg` | ° | 0–2 | > 5 |

**AI media cues**: Camera sees shaking, falling objects. Audio picks up rumbling, glass breaking.

---

### 4. 🌊 Flood / Water Leak

| Sensor | Parameter | Unit | Normal Range | Crisis Threshold |
|--------|-----------|------|-------------|-----------------|
| Water Level | `water_level_cm` | cm | 0 | > 2 |
| DHT22 | `humidity_pct` | % | 30–60 | > 90 |
| Moisture | `moisture_detected` | bool | false | true |
| DHT22 | `temperature_c` | °C | 18–30 | normal |

**AI media cues**: Camera sees standing water, wet floor. Audio picks up dripping, rushing water.

---

### 5. 🔒 Security Breach

| Sensor | Parameter | Unit | Normal Range | Crisis Threshold |
|--------|-----------|------|-------------|-----------------|
| PIR | `motion_detected` | bool | varies | true (during off-hours) |
| Sound | `sound_db` | dB | 30–50 | > 80 (glass break ~95dB) |
| Vibration | `vibration_g` | g | 0–0.05 | > 0.2 (impact) |
| Magnetic | `door_open` | bool | false | true (unauthorized) |
| Ultrasonic | `proximity_cm` | cm | > 200 | < 50 (intrusion) |

**AI media cues**: Camera sees unknown person, forced entry. Audio picks up glass breaking, shouting.

---

### 6. 🏥 Medical Emergency

| Sensor | Parameter | Unit | Normal Range | Crisis Threshold |
|--------|-----------|------|-------------|-----------------|
| Sound | `sound_db` | dB | 30–50 | > 75 (screams/distress) |
| PIR | `motion_detected` | bool | true | false (person collapsed, no motion) |
| Thermal Camera | `body_temp_c` | °C | 36–37.5 | > 39 or < 35 |
| Pressure Mat | `floor_pressure` | bool | false | true (person on floor) |

**AI media cues**: Camera sees person lying on floor. Audio picks up distress calls, moaning, silence after impact.

---

### 7. ⚡ Electrical Hazard

| Sensor | Parameter | Unit | Normal Range | Crisis Threshold |
|--------|-----------|------|-------------|-----------------|
| DHT22/BME280 | `temperature_c` | °C | 18–30 | > 50 (localized hotspot) |
| MQ-2 | `smoke_ppm` | ppm | 0–20 | > 50 (burning insulation) |
| IR Flame | `flame_detected` | bool | false | true (sparking) |
| Sound | `sound_db` | dB | 30–50 | > 60 (buzzing/crackling) |

**AI media cues**: Camera sees sparks, smoke from panel. Audio picks up electrical buzzing.

---

### 8. 🏗️ Structural Damage

| Sensor | Parameter | Unit | Normal Range | Crisis Threshold |
|--------|-----------|------|-------------|-----------------|
| MPU6050 | `vibration_g` | g | 0–0.05 | > 0.15 (persistent) |
| Tilt | `tilt_angle_deg` | ° | 0–2 | > 3 |
| Strain Gauge | `structural_stress` | MPa | baseline | > threshold |
| Sound | `sound_db` | dB | 30–50 | > 70 (cracking) |

**AI media cues**: Camera sees visible cracks, dust. Audio picks up cracking, groaning.

---

### 9. 🧪 Air Quality / Toxic Fume

| Sensor | Parameter | Unit | Normal Range | Crisis Threshold |
|--------|-----------|------|-------------|-----------------|
| MQ-135 | `air_quality_index` | AQI | 0–50 | > 150 |
| MQ-135 | `co2_ppm` | ppm | 400–600 | > 1500 |
| MQ-7 | `co_ppm` | ppm | 0–10 | > 35 |
| MQ-2 | `gas_lpg_ppm` | ppm | 0–15 | > 50 |
| DHT22 | `humidity_pct` | % | 30–60 | varies |

**AI media cues**: Camera sees haze, discolored air. Audio may be normal.

---

### 10. 🏃 Stampede / Crowd Panic

| Sensor | Parameter | Unit | Normal Range | Crisis Threshold |
|--------|-----------|------|-------------|-----------------|
| PIR | `motion_detected` | bool | true | true (sustained, all sensors) |
| Sound | `sound_db` | dB | 50–65 (event) | > 90 (screaming) |
| MPU6050 | `vibration_g` | g | 0–0.05 | > 0.2 (floor vibration from running) |
| Ultrasonic | `proximity_cm` | cm | > 100 | < 30 (overcrowding) |
| Pressure Mat | `floor_pressure` | bool | normal | abnormal (trampling) |

**AI media cues**: Camera sees crowd running, people falling. Audio picks up mass screaming, shouting.

---

## Unified Sensor Snapshot (Combined Object)

The key design: **one ESP32 device reads ALL its available sensors at once** and sends a single combined object. Not separate objects per crisis type.

```ts
interface SensorSnapshot {
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
    acceleration_x: number;
    acceleration_y: number;
    acceleration_z: number;
    tilt_angle_deg: number;
    water_level_cm: number;
    moisture_detected: boolean;
    door_open: boolean;
    proximity_cm: number;
    floor_pressure: boolean;
}

interface MediaCapture {
    photo: Uint8Array;       // JPEG bytes from laptop camera
    video: Uint8Array;       // MP4 bytes (short clip, 5-10s)
    audio: Uint8Array;       // WAV bytes from laptop mic (5-10s)
}

interface CrisisEvidencePayload {
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
```

The AI receives this **single combined object** and determines:
- Is there a crisis? → `boolean`
- What type? → `"fire" | "gas_leak" | "earthquake" | ...`
- How confident? → `0.0 – 1.0`
- What zones? → `string[]`
- What action? → staff routing, guest messaging

---

## Your Decision Needed

> [!IMPORTANT]
> **Which crisis types do you want to include for the hackathon?** Pick from the 10 listed above. My recommendation for a strong hackathon demo:
> - 🔥 Fire (most demonstrable with sensors)
> - 💨 Gas Leak (easy sensor overlap with fire)
> - 🌍 Earthquake (vibration data is interesting)
> - 🔒 Security Breach (good camera/audio AI use case)
> - 🏥 Medical Emergency (great camera AI use case)
> 
> The others (flood, electrical, structural, air quality, stampede) can be added later but are harder to demo convincingly.

> [!IMPORTANT]
> **Sensor scope**: Not all ESP32 sensors listed above are practical for a hackathon. The `SensorSnapshot` above is the superset. Based on your chosen crises, we'll trim it to only the sensors that matter. Some sensors (like `floor_pressure`, `proximity_cm`, `structural_stress`) are exotic — should we include them as simulated values or drop them?
