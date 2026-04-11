# API Reference

Complete API reference for all services in the Rapid Crisis Detection System.

---

## Primary Server (`http://localhost:3000`)

### POST /api/ai/process

Receives raw crisis evidence from IoT devices. Classifies the crisis and queues for action.

| Property | Value |
|----------|-------|
| Method | `POST` |
| Content-Type | `application/json` |
| Auth | None (internal service-to-service) |

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `venue_id` | string | yes | MongoDB ObjectId of the venue |
| `device_id` | string | yes | ESP32 device identifier |
| `device_mac` | string | yes | Device MAC address |
| `timestamp` | string | yes | ISO 8601 timestamp |
| `location.zone` | string | yes | Zone name within venue |
| `location.floor` | number | yes | Floor number |
| `location.lat` | number | yes | GPS latitude |
| `location.lng` | number | yes | GPS longitude |
| `sensors` | SensorSnapshot | yes | All 15 sensor readings |
| `media.photo` | string | yes | Base64 JPEG bytes |
| `media.video` | string | yes | Base64 MP4 bytes |
| `media.audio` | string | yes | Base64 WAV bytes |

**Response (crisis detected)**

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

**Response (no crisis)**

```json
{
    "success": true,
    "crisis_detected": false,
    "message": "No crisis detected from sensor data"
}
```

---

### POST /api/ai/response

Directly enqueue an AI response into the processing pipeline.

| Property | Value |
|----------|-------|
| Method | `POST` |
| Content-Type | `application/json` |

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `venue` | string | yes | MongoDB ObjectId of venue |
| `crisis` | string | yes | MongoDB ObjectId of crisis type |
| `confidence_score` | number | yes | 0.0 to 1.0 |
| `status` | string | yes | `"active"` or `"resolved"` |
| `zones` | string[] | yes | Affected zone names |

**Response**

```json
{
    "success": true,
    "message": "AI response sent to queue",
    "data": {
        "venue_details": { ... },
        "crisis_details": { ... },
        "confidence_score": 0.85,
        "status": "active",
        "zones": ["lobby"]
    }
}
```

---

### POST /api/admin/decision

Admin approves or cancels a pending crisis alert.

| Property | Value |
|----------|-------|
| Method | `POST` |
| Content-Type | `application/json` |

**Request Body**

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `action` | string | yes | `"approve"` or `"cancel"` |
| `payload` | object | yes | Full payload from WebSocket `decided_by_admin` message |

**Response (approve)**

```json
{ "success": true, "message": "Admin approved. Tasks pushed." }
```

**Response (cancel)**

```json
{ "success": true, "message": "Admin safely cancelled the alert." }
```

---

## IoT Server (`http://localhost:4000`)

### GET /api/status

Health check and simulator status.

**Response**

```json
{
    "success": true,
    "simulator": "running",
    "uptime": 123.45,
    "timestamp": "2026-04-02T22:30:00.000Z"
}
```

---

### GET /api/devices

List all registered simulated devices.

**Response**

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

---

### GET /api/devices/:deviceId/reading

Get a single on-demand sensor reading for a specific device.

**URL Params**: `deviceId` — e.g. `ESP32-001`

**Response**

```json
{
    "success": true,
    "reading": { ... }
}
```

---

### GET /api/readings

Snapshot of current readings from all devices.

**Response**

```json
{
    "success": true,
    "count": 3,
    "readings": [ ... ]
}
```

---

### POST /api/simulator/start

Start the cron-based sensor emission.

**Response**

```json
{ "success": true, "message": "Simulator started" }
```

---

### POST /api/simulator/stop

Stop all cron jobs.

**Response**

```json
{ "success": true, "message": "Simulator stopped" }
```

---

## WebSocket (`ws://localhost:3000`)

### Connection

```
ws://localhost:3000?venue_id={venue_id}
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `decided_by_admin` | Server → Client | Crisis needs admin decision (0.40–0.70 confidence) |
| `sent` | Server → Client | SMS alerts dispatched |
| `expired` | Server → Client | 15-min admin decision window expired |
| `sensor_data` | Server → Client | Real-time sensor telemetry (Port 4000) |
| `pause_started` | Server → Client | Telemetry stream paused during crisis |
| `pause_ended` | Server → Client | Telemetry stream resumed |

> [!NOTE]
> **Async Connection Handlers**: WebSocket connection handlers in both the Primary and IoT servers are `async`. They perform an immediate Redis lookup upon client handshake to replay the current system state.

---

## Redis Queues

| Queue | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `ai_response` | primary-server | worker-server | Crisis events from AI processing |
| `admin_approved` | primary-server | worker-server | Admin-approved crisis alerts |

## Redis Pub/Sub

| Channel | Publisher | Subscriber | Purpose |
|---------|----------|------------|---------|
| `messaging_status` | worker-server | primary-server (→ WebSocket) | Real-time status updates |
