# Sentinel AI — Enterprise Crisis Command & IoT Intelligence

A distributed, real-time crisis monitoring and emergency response platform designed for high-occupancy venues. Utilizing IoT telemetry, AI-driven multimodal classification, and an enterprise-grade command interface.

---

## 🚀 Quick Start (Dockerized)

The entire ecosystem is containerized for instant local execution and cloud deployment.

### 1. Prerequisites
- **Docker** & **Docker Compose**
- **Google Gemini API Key** (required for AI classification)

### 2. Configure Environment
Create a `.env` file in the root directory (or ensure your environment has these set):
```bash
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

If no LLM key is provided, the AI worker now falls back to deterministic sensor-based classification so critical incidents are still processed.

### 3. Launch the Ecosystem
```bash
docker-compose up --build
```

### 4. Access the Dashboard
Once the build is complete, access the unified platform at:
**[http://localhost](http://localhost)**

*Nginx routes all traffic automatically:*
- **Frontend**: `http://localhost/`
- **Auth API**: `http://localhost/auth/`
- **Primary API**: `http://localhost/api/`
- **IoT Simulator**: `http://localhost/api/iot/`

---

## 💎 Architecture & Features

### 🌐 Distributed System Nodes
- **Nginx Gateway**: Consolidated entry point for all frontend and backend services.
- **Primary Server**: Central logic hub handling AI results and WebSocket orchestration.
- **Auth Server**: Secure JWT-based authentication with Redis session persistence.
- **Worker Server**: Dedicated consumer for SMS dispatching (Twilio) and crisis deduplication.
- **AI Analytics Node**: Python worker utilizing **Google Gemini Flash-Lite** for real-time risk assessment.
- **IoT Simulator**: High-fidelity simulation of 15+ metrics (temp, smoke, vibration, etc.) from distributed devices.

### ⚡ Persistent Intelligence
- **Redis-Backed Operations**: Critical session state and sensor snapshots are persisted in Redis, ensuring the system survives reboots without state loss.
- **Instant Recovery**: Dashboards "replay" the last known system state upon connection.
- **Real-Time Sync**: Multi-client consistency via Redis Pub/Sub and WebSocket broadcasting.

---

## 🛠 Manual Development Setup

If you prefer to run services manually for debugging:

### Step 1 — Infrastructure
Ensure **MongoDB** (port 27017) and **Redis** (port 6379) are running locally.

### Step 2 — Seed Data
```bash
cd primary-server
bun run src/db/seed.ts
```

### Step 3 — Start Services
Run `bun run dev` (or `npm run dev`) in the following directories:
- `auth-server` (Port 3001)
- `primary-server` (Port 3002)
- `iot-server` (Port 4000)
- `worker-server`
- `client` (Port 3000)

And start the AI worker:
```bash
cd ai
python main.py
```

---

## 🛡 Security & Reliability
- **JWT Rotation**: Secure access and refresh token cycles managed via Redis.
- **Chaos Testing**: The IoT simulator includes a "Chaos Mode" with weighted crisis profiles and sensor jitter to stress-test the AI's skepticism.
- **Deduplication**: Intelligent alert suppression prevents notification fatigue during sustained incidents.
