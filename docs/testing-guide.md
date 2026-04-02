# Testing the Full Workflow

Step-by-step guide to test the entire crisis detection pipeline end-to-end.

## Prerequisites

Make sure these are running locally:
- **MongoDB** on `mongodb://localhost:27017`
- **Redis** on `redis://localhost:6379`

---

## Step 1 — Seed the Database

```bash
cd primary-server
npx tsx src/db/seed.ts
```

This creates:
- 6 crisis types (fire, gas_leak, earthquake, security, water_leak, air_quality)
- 1 venue (Grand Plaza Hotel) with staff for each crisis type
- 3 guests

Note down the **Venue ID** from the output — the IoT server will fetch it automatically from MongoDB.

---

## Step 2 — Start All Services

Open **3 separate terminals** and start each service:

**Terminal 1 — Primary Server (port 3000)**
```bash
cd primary-server
npm run dev
```

**Terminal 2 — Worker Server**
```bash
cd worker-server
npm run dev
```

**Terminal 3 — IoT Server (port 4000)**
```bash
cd iot-server
npm run dev
```

The IoT server auto-starts the cron simulator on boot. You should see sensor readings being generated and sent to the primary-server every 10 seconds.

---

## Step 3 — Watch the Flow

Once all 3 services are running, watch the terminal outputs:

### IoT Server Terminal
You'll see entries like:
```
[IOT] ESP32-001 | temp=85.4°C smoke=920.5ppm vib=0.35g
[IOT ✓] ESP32-001 → primary-server | crisis_detected=true
[IOT] ESP32-002 | temp=24.1°C smoke=4.2ppm vib=0.02g
[IOT ✓] ESP32-002 → primary-server | crisis_detected=false
```

### Primary Server Terminal
You'll see the AI stub classifying readings:
```
POST /api/ai/process 200
```

### Worker Server Terminal
For high-confidence crises (≥ 0.70):
```
[SIMULATED SMS] To: +917645054550 - Body: CRITICAL ALERT: A fire crisis has been confirmed...
```

For medium-confidence crises (0.40 – 0.70):
```
Worker: decided_by_admin message published
```

---

## Step 4 — Manual Testing with curl

### Test a Fire Crisis (high confidence → auto-SMS)

```bash
curl -X POST http://localhost:3000/api/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "venue_id": "<VENUE_ID_FROM_SEED>",
    "device_id": "TEST-001",
    "device_mac": "ESP:FF:FF:FF:FF:FF",
    "timestamp": "2026-04-02T22:00:00.000Z",
    "location": {
      "zone": "kitchen",
      "floor": 2,
      "lat": 28.6139,
      "lng": 77.2090
    },
    "sensors": {
      "temperature_c": 95.0,
      "humidity_pct": 12.0,
      "smoke_ppm": 800.0,
      "co_ppm": 120.0,
      "co2_ppm": 2500.0,
      "gas_lpg_ppm": 40.0,
      "gas_methane_ppm": 8.0,
      "air_quality_index": 300.0,
      "flame_detected": true,
      "motion_detected": true,
      "sound_db": 90.0,
      "vibration_g": 0.4,
      "water_level_cm": 0.0,
      "moisture_detected": false,
      "door_open": false
    },
    "media": {
      "photo": "dGVzdA==",
      "video": "dGVzdA==",
      "audio": "dGVzdA=="
    }
  }'
```

**Expected**: `crisis_detected: true`, `crisis_type: "fire"`, confidence ≥ 0.70 → worker auto-sends SMS.

### Test a Gas Leak (medium confidence → admin decision)

```bash
curl -X POST http://localhost:3000/api/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "venue_id": "<VENUE_ID_FROM_SEED>",
    "device_id": "TEST-002",
    "device_mac": "ESP:AA:BB:CC:DD:EE",
    "timestamp": "2026-04-02T22:01:00.000Z",
    "location": {
      "zone": "storage",
      "floor": 0,
      "lat": 28.6139,
      "lng": 77.2090
    },
    "sensors": {
      "temperature_c": 24.0,
      "humidity_pct": 45.0,
      "smoke_ppm": 10.0,
      "co_ppm": 90.0,
      "co2_ppm": 900.0,
      "gas_lpg_ppm": 250.0,
      "gas_methane_ppm": 120.0,
      "air_quality_index": 180.0,
      "flame_detected": false,
      "motion_detected": false,
      "sound_db": 55.0,
      "vibration_g": 0.03,
      "water_level_cm": 0.0,
      "moisture_detected": false,
      "door_open": false
    },
    "media": {
      "photo": "dGVzdA==",
      "video": "dGVzdA==",
      "audio": "dGVzdA=="
    }
  }'
```

**Expected**: `crisis_detected: true`, `crisis_type: "gas_leak"`, confidence 0.45-0.70 → worker publishes `decided_by_admin` to WebSocket.

### Test No Crisis (ambient readings)

```bash
curl -X POST http://localhost:3000/api/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "venue_id": "<VENUE_ID_FROM_SEED>",
    "device_id": "TEST-003",
    "device_mac": "ESP:11:22:33:44:55",
    "timestamp": "2026-04-02T22:02:00.000Z",
    "location": {
      "zone": "lobby",
      "floor": 1,
      "lat": 28.6139,
      "lng": 77.2090
    },
    "sensors": {
      "temperature_c": 24.0,
      "humidity_pct": 45.0,
      "smoke_ppm": 5.0,
      "co_ppm": 2.0,
      "co2_ppm": 450.0,
      "gas_lpg_ppm": 10.0,
      "gas_methane_ppm": 3.0,
      "air_quality_index": 30.0,
      "flame_detected": false,
      "motion_detected": true,
      "sound_db": 40.0,
      "vibration_g": 0.02,
      "water_level_cm": 0.0,
      "moisture_detected": false,
      "door_open": false
    },
    "media": {
      "photo": "dGVzdA==",
      "video": "dGVzdA==",
      "audio": "dGVzdA=="
    }
  }'
```

**Expected**: `crisis_detected: false` → no action taken.

### Test Admin Approve

After getting a `decided_by_admin` WebSocket message, approve it:

```bash
curl -X POST http://localhost:3000/api/admin/decision \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "payload": {
      "venue_details": { "_id": "<VENUE_ID>", "name": "Grand Plaza Hotel", "guest_details": [{"name": "Alice", "phoneNumber": "+917645054550"}], "staff_details": {"gas_leak": {"name": "Mike Chen", "phoneNumber": "+917645054550"}} },
      "crisis_details": { "_id": "<CRISIS_ID>", "type": "gas_leak" },
      "confidence_score": 0.55,
      "status": "active",
      "zones": ["storage"]
    }
  }'
```

**Expected**: Worker sends SMS, publishes `sent` event.

---

## Step 5 — Check IoT Server Endpoints

```bash
# Health check
curl http://localhost:4000/api/status

# List devices
curl http://localhost:4000/api/devices

# Single device reading
curl http://localhost:4000/api/devices/ESP32-001/reading

# All device readings
curl http://localhost:4000/api/readings

# Stop simulator
curl -X POST http://localhost:4000/api/simulator/stop

# Start simulator
curl -X POST http://localhost:4000/api/simulator/start
```

---

## Step 6 — Verify MongoDB Data

Open MongoDB shell or Compass and check:

```javascript
// Check crisis types
db.crisis_types.find()

// Check venue
db.venues.find()

// Check stored sensor evidence (raw IoT payloads)
db.sensor_evidences.find().sort({ createdAt: -1 }).limit(5)

// Check AI responses
db.ai_responses.find().sort({ createdAt: -1 }).limit(5)
```

---

## Step 7 — Test WebSocket (Optional)

Open a WebSocket client (browser console, wscat, or Postman):

```bash
npx wscat -c "ws://localhost:3000?venue_id=<VENUE_ID>"
```

You'll see real-time messages when:
- A medium-confidence crisis triggers `decided_by_admin`
- SMS is sent → `sent` event
- Admin decision window expires → `expired` event

---

## Quick Reference

| What to Verify | How |
|----------------|-----|
| IoT sends data | Watch IoT server terminal |
| Primary receives and classifies | Watch primary-server terminal |
| Redis queue populated | `redis-cli LLEN ai_response` |
| Worker processes queue | Watch worker-server terminal |
| SMS sent (simulated) | Worker terminal shows `[SIMULATED SMS]` |
| Evidence stored | `db.sensor_evidences.count()` in MongoDB |
| AI responses stored | `db.ai_responses.count()` in MongoDB |
| WebSocket works | Connect with wscat |
