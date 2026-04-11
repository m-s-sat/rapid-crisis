# Client Integration Guide

This document covers how the frontend client (Next.js) integrates with the primary-server APIs and WebSocket for real-time crisis monitoring and admin actions.

## Server Configuration

| Service | URL | Protocol |
|---------|-----|----------|
| Primary Server REST API | `http://localhost:3000` | HTTP |
| Primary Server WebSocket | `ws://localhost:3000?venue_id={venue_id}` | WebSocket |

---

## WebSocket Connection

The client connects to the WebSocket for real-time crisis updates. The `venue_id` query parameter scopes updates to a specific venue.

### Connection

```typescript
const venue_id = "6650a1b2c3d4e5f6a7b8c9d0";
const ws = new WebSocket(`ws://localhost:3000?venue_id=${venue_id}`);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data);
};
```

### Message Types

The WebSocket receives messages published to the `messaging_status` Redis channel. Each message has a `type` field:

#### 1. `decided_by_admin` — Crisis Needs Admin Decision

Sent when confidence score is between 0.40 and 0.70. The admin must approve or cancel.

```json
{
    "type": "decided_by_admin",
    "venue_id": "6650a1b2c3d4e5f6a7b8c9d0",
    "payload": {
        "venue_details": {
            "_id": "6650a1b2c3d4e5f6a7b8c9d0",
            "name": "Grand Plaza Hotel",
            "type": "hotel",
            "address": "123 Main St",
            "city": "San Francisco",
            "staff_details": {
                "fire": { "name": "John Doe", "phoneNumber": "+917645054550" },
                "gas_leak": { "name": "Mike Chen", "phoneNumber": "+917645054550" },
                "earthquake": { "name": "Sarah Kim", "phoneNumber": "+917645054550" },
                "security": { "name": "James Wilson", "phoneNumber": "+917645054550" },
                "water_leak": { "name": "Tom Brown", "phoneNumber": "+917645054550" },
                "air_quality": { "name": "Lisa Park", "phoneNumber": "+917645054550" }
            },
            "guest_details": [
                { "name": "Alice Johnson", "phoneNumber": "+917645054550", "room_no": 402 }
            ]
        },
        "crisis_details": {
            "_id": "6650b2c3d4e5f6a7b8c9d0e1",
            "type": "fire"
        },
        "confidence_score": 0.55,
        "status": "active",
        "zones": ["kitchen"]
    }
}
```

**Client action**: Show an alert card with crisis details and Approve / Cancel buttons. Start a 15-minute countdown timer.

#### 2. `sent` — SMS Successfully Sent

Sent when messages have been delivered (either auto-send for high confidence, or after admin approval).

```json
{
    "type": "sent",
    "venue_id": "6650a1b2c3d4e5f6a7b8c9d0",
    "crisis_id": "6650b2c3d4e5f6a7b8c9d0e1"
}
```

**Client action**: Update UI to show "Alerts sent" status for that crisis.

#### 3. `expired` — Admin Decision Timed Out

Sent when the 15-minute admin decision window expires without action.

```json
{
    "type": "expired",
    "crisis_id": "6650b2c3d4e5f6a7b8c9d0e1",
    "venue_id": "6650a1b2c3d4e5f6a7b8c9d0",
    "message": "Timer expired."
}
```

**Client action**: Remove or disable the approval card for that crisis.

#### 4. `sensor_data` — Real-Time Telemetry Data

Sent continuously (every 10s) from the IoT server (port 4000). Also sent immediately upon connection as a "State Replay".

```json
{
    "type": "sensor_data",
    "payload": {
        "device_id": "ESP32-001",
        "timestamp": "2026-04-11T12:00:00Z",
        "sensors": {
            "temperature_c": 24.5,
            "smoke_ppm": 12.0
            ...
        }
    }
}
```

**Client action**: Update the dashboard grid cards and charts.

---

## REST API Endpoints

### POST /api/admin/decision

Admin approves or cancels a crisis alert.

**Request**

```json
{
    "action": "approve",
    "payload": {
        "venue_details": { ... },
        "crisis_details": { ... },
        "confidence_score": 0.55,
        "status": "active",
        "zones": ["kitchen"]
    }
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `action` | string | `"approve"` or `"cancel"` | Admin's decision |
| `payload` | object | — | The full payload from the `decided_by_admin` WebSocket message |

**Response**

```json
{
    "success": true,
    "message": "Admin approved. Tasks pushed."
}
```

---

### POST /api/ai/response (Direct AI Response)

Used to manually inject an AI response into the queue (bypass AI processing).

**Request**

```json
{
    "venue": "6650a1b2c3d4e5f6a7b8c9d0",
    "crisis": "6650b2c3d4e5f6a7b8c9d0e1",
    "confidence_score": 0.85,
    "status": "active",
    "zones": ["lobby", "kitchen"]
}
```

**Response**

```json
{
    "success": true,
    "message": "AI response sent to queue",
    "data": { ... }
}
```

---

### POST /api/ai/process (IoT Evidence Processing)

Receives raw sensor + media evidence from IoT devices. Not typically called by the client, but documented for completeness.

**Request**: `CrisisEvidencePayload` (see [AI Integration Guide](./ai-integration.md))

**Response**

```json
{
    "success": true,
    "crisis_detected": true,
    "crisis_type": "fire",
    "confidence_score": 0.87,
    "zones": ["kitchen"],
    "message": "Crisis detected and queued for processing"
}
```

---

## IoT Server API (for debugging)

These endpoints are on the IoT server (`http://localhost:4000`).

### GET /api/status

Health check.

```json
{
    "success": true,
    "simulator": "running",
    "uptime": 123.45,
    "timestamp": "2026-04-02T22:30:00.000Z"
}
```

### GET /api/devices

List all simulated ESP32 devices.

```json
{
    "success": true,
    "count": 3,
    "devices": [
        {
            "device_id": "ESP32-001",
            "device_mac": "ESP:A3:4F:B2:C9:E1",
            "zone": "kitchen",
            "floor": 2,
            "lat": 28.6145,
            "lng": 77.2082
        }
    ]
}
```

### GET /api/devices/:deviceId/reading

Get a single on-demand reading from a specific device.

```json
{
    "success": true,
    "reading": {
        "device_id": "ESP32-001",
        "device_mac": "ESP:A3:4F:B2:C9:E1",
        "firmware_version": "3.2.1",
        "timestamp": "2026-04-02T22:30:00.000Z",
        "uptime_ms": 45000,
        "battery_level": 92.3,
        "wifi_rssi": -45,
        "venue_id": "6650a1b2c3d4e5f6a7b8c9d0",
        "sensors": {
            "temperature_c": 24.5,
            "humidity_pct": 45.2,
            "smoke_ppm": 5.1,
            "co_ppm": 2.0,
            "co2_ppm": 450.0,
            "gas_lpg_ppm": 10.3,
            "gas_methane_ppm": 3.2,
            "air_quality_index": 30.0,
            "flame_detected": false,
            "motion_detected": true,
            "sound_db": 42.1,
            "vibration_g": 0.02,
            "water_level_cm": 0.0,
            "moisture_detected": false,
            "door_open": false
        },
        "location": {
            "zone": "kitchen",
            "floor": 2,
            "lat": 28.6145,
            "lng": 77.2082
        }
    }
}
```

### GET /api/readings

Get current readings from ALL devices.

### POST /api/simulator/start

Start the cron-based sensor emission.

### POST /api/simulator/stop

Stop all cron jobs.

---

## Crisis Types Reference

| Key | Display Name | Icon | Color |
|-----|-------------|------|-------|
| `fire` | Fire | 🔥 | `#FF4444` |
| `gas_leak` | Gas Leak | 💨 | `#FF8800` |
| `earthquake` | Earthquake | 🌍 | `#AA5500` |
| `security` | Security Breach | 🔒 | `#CC0000` |
| `water_leak` | Water Leak | 🌊 | `#0088FF` |
| `air_quality` | Air Quality | 🧪 | `#FFAA00` |

---

## Confidence Score Display

| Range | Label | Color | Behavior |
|-------|-------|-------|----------|
| `≥ 0.70` | Critical | Red | Auto-sent, no admin action needed |
| `0.40 – 0.69` | Warning | Orange | Awaiting admin decision |
| `< 0.40` | Low | Green | Ignored by system |

---

## Recommended Client Features

1. **Real-time Crisis Dashboard**: WebSocket-connected panel showing active crises with zone, type, confidence
2. **Admin Decision Cards**: For 0.40–0.70 confidence crises, show approve/cancel buttons with 15-min countdown
3. **Sensor Heatmap**: Display live sensor readings from IoT devices on a venue floor map
4. **Crisis History**: Query MongoDB `sensor_evidence` and `ai_responses` collections for past events
5. **Staff Directory**: Show which staff is assigned to each crisis type from venue's `staff_details`
6. **Guest Notifications Log**: Track which guests were notified and when

---

## MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `venues` | Venue details, staff assignments, guest list |
| `crisis_types` | Crisis type definitions (fire, gas_leak, etc.) |
| `ai_responses` | AI classification results with confidence scores |
| `sensor_evidences` | Raw IoT sensor + media payloads for audit/replay |

---

## Initial State Synchronization

To provide a seamless UX, the system implements a "State Replay" pattern. Upon initial WebSocket connection, the client will receive:

1. **Telemetry Snapshot**: The `iot-server` (port 4000) sends the message `type: "sensor_data"` containing the last known sensor state from Redis.
2. **Active Crisis Logic**: If a crisis was already in progress (e.g., awaiting decision), the `primary-server` (port 3000) sends `type: "decided_by_admin"` immediately, ensuring the action buttons are rendered without waiting for new AI classifications.
