# AI Integration Guide

This document specifies the contract between the system and the AI service. The AI service is a **Redis queue consumer** that pops raw evidence, classifies crises, and pushes results back to another queue.

## How It Works

```
ai_evidence_queue (Redis) ──BRPOP──▶ AI Service ──LPUSH──▶ ai_result_queue (Redis)
```

The AI service does NOT expose an HTTP endpoint. It runs as a background worker.

---

## Input — What the AI Pops from `ai_evidence_queue`

Each item is a JSON string containing a `CrisisEvidencePayload`:

```json
{
    "venue_id": "6650a1b2c3d4e5f6a7b8c9d0",
    "device_id": "ESP32-001",
    "device_mac": "ESP:A3:4F:B2:C9:E1",
    "timestamp": "2026-04-02T22:30:00.000Z",
    "location": {
        "zone": "kitchen",
        "floor": 2,
        "lat": 28.6145,
        "lng": 77.2082
    },
    "sensors": {
        "temperature_c": 85.4,
        "humidity_pct": 12.3,
        "smoke_ppm": 920.5,
        "co_ppm": 145.8,
        "co2_ppm": 2100.0,
        "gas_lpg_ppm": 55.2,
        "gas_methane_ppm": 8.1,
        "air_quality_index": 280.0,
        "flame_detected": true,
        "motion_detected": true,
        "sound_db": 88.5,
        "vibration_g": 0.35,
        "water_level_cm": 0.0,
        "moisture_detected": false,
        "door_open": false
    },
    "media": {
        "photo": "<base64-encoded-jpeg-bytes>",
        "video": "<base64-encoded-mp4-bytes>",
        "audio": "<base64-encoded-wav-bytes>"
    }
}
```

### Sensor Parameters Reference

| Field | Type | Unit | Normal Range |
|-------|------|------|-------------|
| `temperature_c` | number | °C | 18–30 |
| `humidity_pct` | number | % | 30–60 |
| `smoke_ppm` | number | ppm | 0–20 |
| `co_ppm` | number | ppm | 0–10 |
| `co2_ppm` | number | ppm | 400–600 |
| `gas_lpg_ppm` | number | ppm | 0–15 |
| `gas_methane_ppm` | number | ppm | 0–5 |
| `air_quality_index` | number | AQI | 0–50 |
| `flame_detected` | boolean | — | false |
| `motion_detected` | boolean | — | varies |
| `sound_db` | number | dB | 30–50 |
| `vibration_g` | number | g | 0–0.05 |
| `water_level_cm` | number | cm | 0 |
| `moisture_detected` | boolean | — | false |
| `door_open` | boolean | — | false |

### Media Fields

| Field | Type | Description |
|-------|------|-------------|
| `photo` | string | Base64-encoded JPEG from venue camera |
| `video` | string | Base64-encoded MP4 clip (5–10 sec) |
| `audio` | string | Base64-encoded WAV clip (5–10 sec) |

---

## Output — What the AI Pushes to `ai_result_queue`

The AI must push a JSON string containing the classification result **enriched with venue and crisis details from MongoDB**.

```json
{
    "venue_id": "6650a1b2c3d4e5f6a7b8c9d0",
    "zone": "kitchen",
    "device_id": "ESP32-001",
    "timestamp": "2026-04-02T22:30:00.000Z",
    "crisis_detected": true,
    "crisis_type": "fire",
    "confidence_score": 0.87,
    "mongo_response_id": "6650d4e5f6a7b8c9d0e1f2a3",
    "venue_details": {
        "_id": "6650a1b2c3d4e5f6a7b8c9d0",
        "name": "Grand Plaza Hotel",
        "staff_details": { ... },
        "guest_details": [ ... ]
    },
    "crisis_details": {
        "_id": "6650b2c3d4e5f6a7b8c9d0e1",
        "type": "fire"
    }
}
```

### Output Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `venue_id` | string | yes | From input |
| `zone` | string | yes | From input location.zone |
| `device_id` | string | yes | From input |
| `timestamp` | string | yes | From input |
| `crisis_detected` | boolean | yes | Whether crisis found |
| `crisis_type` | string | if detected | `fire`, `gas_leak`, `earthquake`, `security`, `water_leak`, `air_quality` |
| `confidence_score` | number | if detected | 0.0 to 1.0 |
| `mongo_response_id` | string | if detected | _id of the AiResponse document created |
| `venue_details` | object | if detected | Full venue document from MongoDB |
| `crisis_details` | object | if detected | Full crisis_type document from MongoDB |

### No Crisis Result

If no crisis detected, still push to queue so worker can track:

```json
{
    "venue_id": "6650a1b2c3d4e5f6a7b8c9d0",
    "zone": "kitchen",
    "device_id": "ESP32-001",
    "timestamp": "2026-04-02T22:30:00.000Z",
    "crisis_detected": false
}
```

---

## What the AI Must Do (Step by Step)

1. `BRPOP ai_evidence_queue 0` (blocking wait)
2. Parse the JSON payload
3. Analyze `sensors` + `media` to classify crisis
4. If crisis detected:
   a. Look up `venue_id` in MongoDB `venues` collection
   b. Look up `crisis_type` in MongoDB `crisis_types` collection
   c. Insert a new document in `ai_responses`:
      ```python
      {
          "venue": ObjectId(venue_id),
          "crisis": crisis_doc["_id"],
          "confidence_score": 0.87,
          "status": "active",
          "zones": ["kitchen"]
      }
      ```
   d. Build enriched output with venue_details and crisis_details
5. `LPUSH ai_result_queue <result_json>`
6. Loop back to step 1

---

## Downstream Behavior (What Happens to Your Output)

The worker-server consumes from `ai_result_queue` and:

| Confidence | Action |
|------------|--------|
| `≥ 0.70` | Auto-send SMS to staff + guests |
| `0.40 – 0.69` | Push to admin dashboard for manual approval |
| `< 0.40` | Ignored |

The worker also has **dedup logic**: if the same `crisis_type` in the same `zone` for the same `venue` is already active (within 10 minutes), duplicate SMS is suppressed. So you don't need to worry about duplicate handling — just classify accurately.

---

## Crisis Classification Guide

### Fire
- `smoke_ppm > 200`, `co_ppm > 50`, `flame_detected === true`, `temperature_c > 60`
- Camera: Orange/red glow, visible flames, thick smoke
- Audio: Crackling, fire alarm sounds

### Gas Leak
- `gas_lpg_ppm > 200`, `gas_methane_ppm > 100`, `co_ppm > 80` (without flame)
- Camera: Gas distortion/haze
- Audio: Hissing sound

### Earthquake
- `vibration_g > 0.3`
- Camera: Shaking, falling objects
- Audio: Rumbling, glass breaking

### Security Breach
- `motion_detected === true`, `sound_db > 80`, `door_open === true`
- Camera: Unknown person, forced entry
- Audio: Glass breaking, shouting

### Water Leak
- `water_level_cm > 2`, `moisture_detected === true`, `humidity_pct > 85`
- Camera: Standing water, wet surfaces
- Audio: Dripping, rushing water

### Air Quality
- `air_quality_index > 150`, `co2_ppm > 1500`
- Camera: Haze, chemical spill
- Audio: Usually normal

---

## Current Stub Implementation

`ai/main.py` contains a threshold-based classifier as a temporary stub. To replace with Gemini:

```python
import google.generativeai as genai
import base64

genai.configure(api_key="YOUR_API_KEY")
model = genai.GenerativeModel("gemini-pro-vision")

def classify_with_gemini(evidence):
    prompt = f"""Analyze these sensor readings and media from a hotel:
    Sensors: {json.dumps(evidence['sensors'])}
    Zone: {evidence['location']['zone']}

    Determine if there is a crisis. Return JSON:
    {{"crisis_detected": bool, "crisis_type": str, "confidence_score": float}}
    Valid types: fire, gas_leak, earthquake, security, water_leak, air_quality
    """

    photo_bytes = base64.b64decode(evidence['media']['photo'])

    response = model.generate_content([prompt, photo_bytes])
    return json.loads(response.text)
```

## Running the AI Service

```bash
cd ai
pip install -r requirements.txt
python main.py
```

Required env vars in `ai/.env`:
```
REDIS_URL=redis://localhost:6379
MONGO_URI=mongodb://localhost:27017/google-solutions
```
