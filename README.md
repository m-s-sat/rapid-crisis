# Sentinel AI — Enterprise Crisis Command & IoT Intelligence

Sentinel AI is a distributed, real-time crisis monitoring and emergency response platform designed for high-occupancy hospitality venues. It utilizes IoT telemetry, Gemini 2.0 AI-driven multimodal classification, and an enterprise-grade command interface to accelerate emergency response times.

---

## 🛠 Prerequisites

Before starting, ensure you have the following ready:

1.  **Google Gemini API Key**: [Get it here from AI Studio](https://aistudio.google.com/). Required for intelligent incident classification.
2.  **Docker Engine & Docker Compose**: (Recommended) For one-command deployment.
3.  **Local Infrastructure (if running manually)**:
    *   **MongoDB**: v6.0+ (Port 27017)
    *   **Redis**: v7.0+ (Port 6379)
    *   **Bun or Node.js**: To run the backend services.
    *   **Python 3.10+**: To run the AI Analytics Node.

---

## 🚀 Setup Path A: Docker (Zero-to-Hero)

The entire ecosystem is containerized. This is the fastest way to see the value.

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/sentinel-ai.git
    cd sentinel-ai
    ```
2.  **Configure Environment**: Create a `.env` file in the root:
    ```bash
    GOOGLE_API_KEY=your_gemini_key_here
    GEMINI_MODEL=gemini-2.0-flash
    ```
3.  **Launch**:
    ```bash
    docker-compose up --build
    ```
4.  **Access**: Open [http://localhost](http://localhost) in your browser.

---

## 💻 Setup Path B: Manual (Local Development)

If you need to debug individual services, follow this order:

### 1. Database & Cache
Start your local MongoDB and Redis instances.

### 2. Service Initialization
Run `bun install` (or `npm install`) in every directory. Then:

| Service | Directory | Command | Port |
| :--- | :--- | :--- | :--- |
| **Auth Server** | `/auth-server` | `bun run dev` | 3001 |
| **Primary Server** | `/primary-server` | `bun run dev` | 3002 |
| **Worker Server** | `/worker-server` | `bun run dev` | - |
| **IoT Simulator** | `/iot-server` | `bun run dev` | 4000 |
| **Frontend UI** | `/client` | `bun run dev` | 3000 |
| **AI Node** | `/ai` | `python main.py` | - |

---

## 🕹️ How to Use: Triggering Your First Crisis

The system remains in a "Monitoring" state by default. To see the AI in action:

1.  **Open the IoT Simulator**: Navigate to `http://localhost:4000` (or `http://localhost/api/iot/` in Docker).
2.  **Start Telemetry**: Click the **"START TELEMETRY"** button. You will see 15+ sensors (Temp, Smoke, Sound, etc.) start streaming data.
3.  **Trigger a Crisis**: Use the "Crisis Presets" (e.g., *Fire in Kitchen*) or toggle **"CHAOS MODE"**.
4.  **Watch the Magic**:
    *   The IoT server captures a "Visual Evidence" snapshot.
    *   **Gemini 2.0** analyzes the multimodal data in the background.
    *   The **Staff Dashboard** (`http://localhost:3000`) will pop up with a high-priority alert, showing the AI's confidence score and recommended action.

---

## 💎 Key Features
- **Multimodal AI**: Uses Gemini to differentiate between a "Birthday Candle" and a "Kitchen Fire" using both sensor data and photos.
- **Crisis Deduplication**: Intelligent logic prevents spamming the staff with multiple alerts for the same incident.
- **State Persistence**: Redis ensures that if the server restarts, the active crisis state is instantly restored.
- **Automated Response**: Real-time Twilio SMS integration for automated guest evacuation alerts.

---

## 🛡 Security & Reliability
- **JWT Rotation**: Secure access and refresh cycles with Redis persistence.
- **Hardware Simulation**: ESP32 logic simulation with realistic sensor jitter and drift.
- **Deduplication**: Alert suppression logic prevents notification fatigue.

---

## ☁️ Deployment (Free Tier)
This solution is optimized for **Google Cloud Free Tier**:
- **Cloud Run**: Microservices
- **Firebase**: Frontend
- **MongoDB Atlas**: Database (M0 Free)
- **AI Studio**: Gemini 2.0 Flash (Free)
