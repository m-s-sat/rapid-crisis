# Rapid Crisis Detection System — Architecture

## System Overview

A real-time crisis detection platform for hospitality venues (hotels, resorts, convention centers). The system uses IoT sensors + camera/mic to detect crises, classifies them using AI (Gemini/GenAI), notifies relevant staff, and messages guests with safety instructions.

## Supported Crisis Types

| Key | Crisis | Description |
|-----|--------|-------------|
| `fire` | Fire | Active fire or high fire risk |
| `gas_leak` | Gas Leak | LPG, natural gas, or CO buildup |
| `earthquake` | Earthquake | Seismic activity / structural shaking |
| `security` | Security Breach | Unauthorized intrusion, break-in |
| `water_leak` | Water Leak / Flood | Pipe burst, flooding, rising water |
| `air_quality` | Air Quality / Toxic Fume | Chemical spill, poor air quality |

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────────┐
│   IoT Server    │     │   Primary Server     │
│   (port 4000)   │────▶│   (port 3000)        │
│                 │     │                      │
│ ESP32 Simulator │     │ POST /api/ai/process │
│ Sensor readings │     │   ├─ Store evidence  │
│ Media captures  │     │   ├─ Trend detection │
│ Cron scheduler  │     │   └─ Push to Redis   │
└─────────────────┘     │        queue         │
                        │                      │
                        │ WebSocket (ws://)    │
┌─────────────────┐     │   ├─ Trend warnings  │
│     Client      │◀───▶│   ├─ Crisis alerts   │
│   (Next.js)     │     │   └─ Auto-resolve    │
│   port 3001     │     │                      │
└─────────────────┘     │ POST /api/admin/     │
                        │   decision           │
                        └─────────────────────┘

┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│                 │     │                      │     │                 │
│  ai_evidence_   │     │   AI Service         │     │  ai_result_     │
│  queue (Redis)  │────▶│   (Python)           │────▶│  queue (Redis)  │
│                 │     │   Gemini/Stub         │     │                 │
└─────────────────┘     └─────────────────────┘     └────────┬────────┘
                                                             │
                                                    ┌────────▼────────┐
                                                    │  Worker Server  │
                                                    │                 │
                                                    │ Dedup check     │
                                                    │ active_crisis:* │
                                                    │                 │
                                                    │ ≥0.70 → SMS    │
                                                    │ 0.40-0.70 →    │
                                                    │   admin         │
                                                    │ <0.40 → ignore │
                                                    └────────┬────────┘
                                                             │
                                                    ┌────────▼────────┐
                                                    │   Twilio SMS    │
                                                    │  Staff + Guests │
                                                    └─────────────────┘
```

## Data Flow

```
1. IoT Server generates sensor snapshot + media capture
2. POST → /api/ai/process on primary-server
3. Primary-server:
   a. Stores raw evidence in MongoDB (sensor_evidences)
   b. Records sensor metrics in Redis sorted sets for trend detection
   c. If rising trend detected → publishes trend_warning via WebSocket
   d. Pushes payload to Redis queue: ai_evidence_queue
   e. Returns 202 Accepted (non-blocking)
4. AI Service (Python):
   a. BRPOP from ai_evidence_queue
   b. Classifies crisis (threshold stub / Gemini)
   c. Creates AiResponse in MongoDB
   d. Pushes enriched result to ai_result_queue
5. Worker Server:
   a. BRPOP from ai_result_queue
   b. DEDUP CHECK: active_crisis:{venue}:{zone}:{type} in Redis
      - If key exists → update session, skip SMS (unless confidence escalated)
      - If key missing → create session with 10-min TTL
   c. Route by confidence:
      - ≥0.70 → auto-send SMS to staff + guests
      - 0.40–0.70 → push to admin via WebSocket for approval
      - <0.40 → ignore
6. Admin approves → pushes to Redis admin_approved queue → SMS sent
7. Crisis auto-resolves when active_crisis:* key expires (10 min TTL)
   → primary-server detects via keyspace notification → sends crisis_resolved via WebSocket
8. **State Recovery**: Newly connected clients receive a "burst" of current state data from Redis caches on port 3000 and 4000.
```

## Crisis Deduplication

Prevents SMS spam when multiple devices detect the same crisis:

| Scenario | Behavior |
|----------|----------|
| 3 devices detect fire in kitchen | 1 SMS (same venue+zone+type = 1 session) |
| Fire in kitchen + fire in lobby | 2 SMS (different zones = 2 sessions) |
| Fire detected, then 10 sec later again | Update existing session, skip SMS |
| Confidence starts at 0.50, rises to 0.75 | SMS sent when peak crosses 0.70 |
| No readings for 10 minutes | Crisis auto-resolves (Redis TTL expires) |

## Trend Detection (Gradual Onset)

Catches crises that build slowly (fire without instant smoke):

- Maintains 60-second sliding window of sensor values per zone
- Compares average of older half vs newer half
- If newer average > 1.5× older average → rising trend warning
- Published to admin dashboard via WebSocket as early warning

## Services

| Service | Port | Tech | Purpose |
|---------|------|------|---------|
| `iot-server` | 4000 | Express + TypeScript | Simulates ESP32 IoT devices |
| `primary-server` | 3000 | Express + TypeScript | API gateway, trend detection, WebSocket |
| `ai` | — | Python | Queue-based crisis classification |
| `worker-server` | — | TypeScript | Redis consumer, dedup, SMS via Twilio |
| `client` | 3001 | Next.js + Redux | Admin dashboard |

## Redis Architecture

### Queues (List-based, BRPOP)

| Queue | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `ai_evidence_queue` | primary-server | AI service | Raw sensor + media evidence |
| `ai_result_queue` | AI service | worker-server | AI classification results |
| `admin_approved` | primary-server | worker-server | Admin-approved alerts |

### Keys

| Pattern | Purpose | TTL |
|---------|---------|-----|
| `active_crisis:{venue}:{zone}:{type}` | Crisis dedup session | 10 min |
| `trend:{venue}:{zone}:{metric}` | Rolling sensor values | 2 min |
| `active_crisis_cache:{venue_id}` | Persistent crisis manual review state | 15 min |
| `last_telemetry:{venue_id}` | Last sensor payload before pause | 1 hour |

### Pub/Sub

| Channel | Publisher | Subscriber | Purpose |
|---------|----------|------------|---------|
| `messaging_status` | worker-server, primary-server | primary-server (→ WebSocket) | Real-time updates |

## Databases

| Database | Purpose |
|----------|---------|
| MongoDB | Venues, crisis types, AI responses, sensor evidence |
| Redis | Message queues, crisis dedup, trend tracking, pub/sub |

## Quick Start

```bash
# 1. Start MongoDB and Redis

# 2. Seed the database
cd primary-server && npx tsx src/db/seed.ts

# 3. Install AI dependencies
cd ai && pip install -r requirements.txt

# 4. Start all services (4 terminals)
cd primary-server && npm run dev    # Terminal 1
cd worker-server && npm run dev     # Terminal 2
cd ai && python main.py             # Terminal 3
cd iot-server && npm run dev        # Terminal 4

# 5. Start client (optional)
cd client && npm run dev            # Terminal 5
```
