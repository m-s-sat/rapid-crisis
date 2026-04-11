# Rapid Crisis Detection — Enterprise Command Dashboard

A distributed, real-time crisis monitoring and emergency response platform designed for high-occupancy venues. Utilizing IoT telemetry, AI-driven classification, and an enterprise-grade command interface.

### 🌐 Distributed System Architecture
- **Primary Server (Gateway)**: Central logic hub handling AI results, admin decisions, and WebSocket orchestration.
- **Worker Server**: Dedicated consumer for SMS dispatching (Twilio) and crisis deduplication.
- **AI Analytics Node**: Integrated Python service for real-time crisis classification and confidence scoring.
- **IoT Simulator**: High-fidelity ESP32 sensor emulation with 15+ metrics per device.

### 💎 Premium Visual Experience & UX
- **Mobile-First Sidebar**: Responsive floating navigation using `shadcn/ui` Sheets for seamless control on any device.
- **Glassmorphic Interface**: High-end aesthetic utilizing `backdrop-blur`, subtle borders, and harmonious dark-mode palettes.
- **Dynamic Micro-animations**: Components feature cascading entry effects and real-time pulse indicators for system health.
- **Visual Intelligence**: Automated admin avatars (DiceBear) and text-gradient styling for a professional command-center feel.

### ⚡ Persistent State Intelligence
- **Redis-Backed Operations**: Critical session state (active crises and sensor snapshots) is persisted in Redis.
- **Instant Recovery**: The system survives server reboots without loss of state. Dashboards instantly "replay" the last known system state upon connection.
- **Real-Time Synchronization**: Multi-client consistency ensured via Redis Pub/Sub and WebSocket state broadcasting.

---

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

---

## Step 2 — Start All Services

Open **4 separate terminals** and start each service:

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

**Terminal 3 — AI Analytics (Python)**
```bash
cd ai
python main.py
```

**Terminal 4 — IoT Simulator (port 4000)**
```bash
cd iot-server
npm run dev
```

---

## Step 3 — Start the Dashboard

```bash
cd client
npm run dev
```

Access the command center at `http://localhost:3000`.

---

## Watch the Flow

Once all services are running, watch the terminal outputs:

### IoT Server Terminal
You'll see real-time sensor generation:
```
[IOT] ESP32-001 | temp=85.4°C smoke=920.5ppm vib=0.35g
```

### Primary Server Terminal
Watch the WebSocket orchestration and AI processing logs.

### Worker Server Terminal
For high-confidence crises (≥ 0.70):
```
[SIMULATED SMS] To: +917645054550 - Body: CRITICAL ALERT...
```
