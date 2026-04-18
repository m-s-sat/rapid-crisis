import json
import time
import os
import base64
import asyncio
import redis.asyncio as redis
from datetime import datetime, timezone
from dotenv import load_dotenv
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

load_dotenv()

class MediaCapture(BaseModel):
    photo: Optional[str] = None
    video: Optional[str] = None
    audio: Optional[str] = None

class CrisisEvidencePayload(BaseModel):
    venue_id: Optional[str] = ""
    device_id: Optional[str] = "unknown"
    device_mac: Optional[str] = None
    timestamp: Optional[str] = ""
    location: Optional[Dict[str, Any]] = Field(default_factory=dict)
    sensors: Optional[Dict[str, Any]] = Field(default_factory=dict)
    media: Optional[MediaCapture] = None

class CrisisClassification(BaseModel):
    crisis_detected: bool = Field(description="Whether a crisis is occurring")
    crisis_type: str = Field(description="Type of crisis: fire, gas_leak, earthquake, security, water_leak, air_quality, or other")
    confidence_score: float = Field(description="Algorithmic confidence score (0.0 to 1.0)")
    summary: str = Field(description="A 1-sentence briefing for human responders")
    reasoning: str = Field(description="Reasoning for the classification")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/google-solutions")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-super-120b-a12b:free")
INPUT_QUEUE = "ai_evidence_queue"
OUTPUT_QUEUE = "ai_result_queue"

# Initialize LLM with OpenRouter configuration
llm = None
raw_llm = None
if OPENROUTER_API_KEY:
    try:
        raw_llm = ChatOpenAI(
            openai_api_key=OPENROUTER_API_KEY,
            model=OPENROUTER_MODEL,
            base_url="https://openrouter.ai/api/v1",
            temperature=0.0,
            default_headers={"HTTP-Referer": "https://sentinel.ai", "X-Title": "Sentinel OS"}
        )
        llm = raw_llm.with_structured_output(CrisisClassification)
        print(f"[AI] Initialized OpenRouter LLM (Model: {OPENROUTER_MODEL})")
    except Exception as e:
        print(f"[AI ERROR] Failed to initialize OpenRouter LLM: {e}")
else:
    if GOOGLE_API_KEY:
        print("[AI WARNING] GOOGLE_API_KEY is set, but this worker currently uses OpenRouter-compatible models. Falling back to deterministic sensor classification.")
    else:
        print("[AI WARNING] No LLM API key found. Falling back to deterministic sensor classification.")

# Converts media data to a LangChain HumanMessage
def media_to_message(media_data: str, media_type: str = "image", mime_type: Optional[str] = None) -> HumanMessage:
    if media_type == "image":
        if not media_data.startswith("data:"):
            m_type = mime_type or "image/jpeg"
            media_data = f"data:{m_type};base64,{media_data}"
        return HumanMessage(content=[{"type": "image_url", "image_url": {"url": media_data}}])
    
    pure_b64 = media_data
    if "," in media_data:
        prefix, pure_b64 = media_data.split(",", 1)
        if not mime_type and ":" in prefix and ";" in prefix:
             mime_type = prefix.split(":")[1].split(";")[0]

    return HumanMessage(content=[{
        "type": "media", 
        "mime_type": mime_type or (f"{media_type}/mp3" if media_type == "audio" else "video/mp4"), 
        "data": pure_b64
    }])


def deterministic_classification(evidence: CrisisEvidencePayload):
    zone = evidence.location.get("zone", "unknown") if evidence.location else "unknown"
    sensors = evidence.sensors or {}

    temp = float(sensors.get("temperature_c", 0) or 0)
    smoke = float(sensors.get("smoke_ppm", 0) or 0)
    vib = float(sensors.get("vibration_g", 0) or 0)
    gas_lpg = float(sensors.get("gas_lpg_ppm", 0) or 0)
    gas_methane = float(sensors.get("gas_methane_ppm", 0) or 0)
    co = float(sensors.get("co_ppm", 0) or 0)
    co2 = float(sensors.get("co2_ppm", 0) or 0)
    air_quality = float(sensors.get("air_quality_index", 0) or 0)
    water_level = float(sensors.get("water_level_cm", 0) or 0)
    sound = float(sensors.get("sound_db", 0) or 0)
    flame_detected = bool(sensors.get("flame_detected", False))
    moisture_detected = bool(sensors.get("moisture_detected", False))
    motion_detected = bool(sensors.get("motion_detected", False))
    door_open = bool(sensors.get("door_open", False))

    if temp > 45 or smoke > 350 or flame_detected:
        reasons = []
        if temp > 45:
            reasons.append(f"temperature_c={temp}C")
        if smoke > 350:
            reasons.append(f"smoke_ppm={smoke}")
        if flame_detected:
            reasons.append("flame_detected=true")
        return {
            "crisis_detected": True,
            "crisis_type": "fire",
            "confidence_score": 0.99 if flame_detected or temp > 70 or smoke > 700 else 0.93,
            "summary": f"Fire indicators detected in {zone}.",
            "reasoning": "Deterministic fire trigger: " + ", ".join(reasons),
            "is_hardware_trigger": True,
        }

    if gas_lpg > 120 or gas_methane > 120 or co > 80:
        reasons = []
        if gas_lpg > 120:
            reasons.append(f"gas_lpg_ppm={gas_lpg}")
        if gas_methane > 120:
            reasons.append(f"gas_methane_ppm={gas_methane}")
        if co > 80:
            reasons.append(f"co_ppm={co}")
        return {
            "crisis_detected": True,
            "crisis_type": "gas_leak",
            "confidence_score": 0.91,
            "summary": f"Gas leak indicators detected in {zone}.",
            "reasoning": "Deterministic gas trigger: " + ", ".join(reasons),
            "is_hardware_trigger": True,
        }

    if vib > 0.4:
        return {
            "crisis_detected": True,
            "crisis_type": "earthquake",
            "confidence_score": 0.96,
            "summary": f"Seismic activity detected in {zone}.",
            "reasoning": f"Deterministic earthquake trigger: vibration_g={vib}",
            "is_hardware_trigger": True,
        }

    if water_level > 5 or moisture_detected:
        reasons = []
        if water_level > 5:
            reasons.append(f"water_level_cm={water_level}")
        if moisture_detected:
            reasons.append("moisture_detected=true")
        return {
            "crisis_detected": True,
            "crisis_type": "water_leak",
            "confidence_score": 0.86,
            "summary": f"Water leak indicators detected in {zone}.",
            "reasoning": "Deterministic water-leak trigger: " + ", ".join(reasons),
            "is_hardware_trigger": True,
        }

    if air_quality > 180 or co2 > 1500:
        reasons = []
        if air_quality > 180:
            reasons.append(f"air_quality_index={air_quality}")
        if co2 > 1500:
            reasons.append(f"co2_ppm={co2}")
        return {
            "crisis_detected": True,
            "crisis_type": "air_quality",
            "confidence_score": 0.74,
            "summary": f"Air quality degradation detected in {zone}.",
            "reasoning": "Deterministic air-quality trigger: " + ", ".join(reasons),
            "is_hardware_trigger": False,
        }

    if motion_detected and door_open and sound > 75:
        return {
            "crisis_detected": True,
            "crisis_type": "security",
            "confidence_score": 0.71,
            "summary": f"Security breach indicators detected in {zone}.",
            "reasoning": f"Deterministic security trigger: motion_detected=true, door_open=true, sound_db={sound}",
            "is_hardware_trigger": False,
        }

    return {
        "crisis_detected": False,
        "crisis_type": "other",
        "confidence_score": 0.0,
        "summary": f"No crisis indicators detected in {zone}.",
        "reasoning": "No deterministic crisis thresholds exceeded.",
        "is_hardware_trigger": False,
    }

# Performs AI classification using the configured LLM (Sensor-Priority Logic)
async def classify_with_ai(evidence: CrisisEvidencePayload):
    if not llm or not raw_llm:
        return deterministic_classification(evidence)

    zone = evidence.location.get("zone", "unknown") if evidence.location else "unknown"
    sensors = evidence.sensors or {}
    
    # Accurate keys from IoT SensorSnapshot: temperature_c, smoke_ppm, vibration_g
    temp = sensors.get("temperature_c", 0)
    smoke = sensors.get("smoke_ppm", 0)
    vib = sensors.get("vibration_g", 0)

    # SAFETY-FIRST HARD-CHECK: If values are physically dangerous, FORCE crisis_detected = True
    hard_check_triggered = False
    hard_reason = ""
    if temp > 45:
        hard_check_triggered = True
        hard_reason = f"Critical Temperature Detected: {temp}C"
    elif smoke > 350:
        hard_check_triggered = True
        hard_reason = f"Critical Smoke Detected: {smoke}ppm"
    elif vib > 0.4:
        hard_check_triggered = True
        hard_reason = f"Critical Vibration Detected: {vib}g"

    instructions = """You are 'Sentinel AI'. MANDATORY RULES:
1. SENSOR MAPPING: 'temperature_c' (Celsius), 'smoke_ppm' (ppm), 'vibration_g' (g).
2. THRESHOLDS: IF temperature_c > 45 OR smoke_ppm > 350 OR vibration_g > 0.4 THEN crisis_detected = true.
3. OUTPUT: Respond with ONLY this JSON structure:
{
  "crisis_detected": boolean,
  "crisis_type": "fire" | "gas_leak" | "earthquake" | "security" | "water_leak",
  "confidence_score": float,
  "summary": "1-sentence briefing",
  "reasoning": "Specify which threshold was exceeded."
}"""

    messages = [
        HumanMessage(content=f"{instructions}\n\nAnalyze Zone: '{zone}'.\n\nTelemetry: {json.dumps(sensors)}")
    ]

    for attempt in range(3):
        try:
            response_msg = await raw_llm.ainvoke(messages)
            raw_text = response_msg.content.strip()
            print(f"[AI DEBUG] Raw response from {OPENROUTER_MODEL}:\n{raw_text}")
            
            start = raw_text.find("{")
            end = raw_text.rfind("}")
            if start == -1 or end == -1: raise ValueError("No JSON found")
            
            data = json.loads(raw_text[start:end+1])
            
            # Field Mapping Fallback
            if "crisis_detected" not in data:
                if "status" in data: data["crisis_detected"] = (data["status"].lower() != "normal")
            
            # OVERRIDE: If hard check was triggered, ensure crisis_detected is True
            if hard_check_triggered:
                print(f"[AI-BYPASS] Deterministic safety trigger pulled: {hard_reason}")
                data["crisis_detected"] = True
                data["confidence_score"] = max(data.get("confidence_score", 0.0), 0.95)
                if not data.get("reasoning"): data["reasoning"] = hard_reason
            
            result = CrisisClassification(**data).model_dump()
            result["is_hardware_trigger"] = hard_check_triggered
            return result
            
        except Exception as e:
            if "429" in str(e):
                await asyncio.sleep(2 ** attempt + 1)
                continue
            
            # Fail-Safe: If AI fails but sensors are high, still report crisis
            if hard_check_triggered:
                print(f"[AI FAIL-SAFE] AI error, but sensors at CRITICAL levels. Triggering emergency.")
                return {
                    "crisis_detected": True,
                    "crisis_type": "fire" if temp > 45 else "other",
                    "confidence_score": 0.99,
                    "summary": "Emergency levels detected by hardware sensors.",
                    "reasoning": hard_reason,
                    "is_hardware_trigger": True
                }
                
            print(f"[AI ERROR] Classification/Parsing failed: {e}")
            fallback = deterministic_classification(evidence)
            fallback["reasoning"] = f"{fallback['reasoning']} Fallback activated after AI error: {e}"
            return fallback
    
    fallback = deterministic_classification(evidence)
    fallback["reasoning"] = f"{fallback['reasoning']} Fallback activated after AI retries were exhausted."
    return fallback

# Serializes MongoDB BSON types to JSON
def json_serializer(obj):
    if isinstance(obj, ObjectId): return str(obj)
    if isinstance(obj, datetime): return obj.isoformat()
    return str(obj)

# Retrieves metadata from MongoDB for the detected crisis and venue
async def get_venue_and_crisis_details(mongo_db, venue_id, crisis_type):
    venue, crisis = None, None
    try:
        if venue_id: venue = await mongo_db.venues.find_one({"_id": ObjectId(venue_id)})
    except: pass
    try:
        crisis = await mongo_db.crisis_types.find_one({"type": crisis_type})
    except: pass
    enriched_venue = dict(venue) if venue else None

    if venue_id:
        try:
            venue_object_id = ObjectId(venue_id)

            guests = []
            try:
                guests = await mongo_db.guests.find({
                    "venue_id": venue_object_id,
                    "status": "active"
                }).to_list(length=500)
            except:
                guests = []

            staff = []
            for collection_name in ("staffs", "staff"):
                try:
                    collection = getattr(mongo_db, collection_name)
                    staff = await collection.find({"venue_id": venue_object_id}).to_list(length=500)
                    if staff:
                        break
                except:
                    continue

            if not enriched_venue:
                enriched_venue = {"_id": venue_id}

            if guests and not enriched_venue.get("guest_details"):
                enriched_venue["guest_details"] = guests

            if staff and not enriched_venue.get("staff_details"):
                enriched_venue["staff_details"] = {
                    f"{entry.get('expertise', 'staff')}_{index}": entry
                    for index, entry in enumerate(staff, start=1)
                }
        except:
            pass

    return enriched_venue, crisis

# Formats MongoDB documents for clean serialization
def format_doc(doc):
    if not doc: return None
    return json.loads(json.dumps(doc, default=json_serializer))

# Throttle concurrency to prevent rate limit flooding
concurrency_limit = asyncio.Semaphore(3)

# Orchestrates the evidence processing workflow
async def process_evidence(raw_json, redis_client, mongo_db):
    start_time = time.time()
    try:
        raw_dict = json.loads(raw_json)
        evidence = CrisisEvidencePayload(**raw_dict)
        device_id, sensors = evidence.device_id, evidence.sensors or {}
        
        # Smart Throttling & Critical Bypass (Matching to IoT Server keys in SensorSnapshot)
        # Accurate keys: temperature_c, smoke_ppm, vibration_g
        temp = sensors.get("temperature_c", 0)
        smoke = sensors.get("smoke_ppm", 0)
        vib = sensors.get("vibration_g", 0)
        
        is_critical = (temp > 45 or smoke > 350 or vib > 0.4)
        cooldown_key = f"ai:cooldown:{device_id}"
        if not is_critical:
            if await redis_client.get(cooldown_key): return

        await redis_client.set(cooldown_key, "active", ex=5)

        # Discard stale evidence
        try:
            event_time = datetime.fromisoformat(evidence.timestamp.replace("Z", "+00:00")).timestamp()
            if (time.time() - event_time) > 120: return
        except: pass

        async with concurrency_limit:
            zone = evidence.location.get("zone", "unknown") if evidence.location else "unknown"
            if is_critical: print(f"[AI-CRITICAL] Bypassing cooldown for {device_id}!")
            
            print(f"[AI] Analyzing {device_id}@{zone}")
            classification = await classify_with_ai(evidence)

            if not classification.get("crisis_detected"):
                print(f"[AI] No crisis at {zone}: {classification.get('reasoning', 'Normal')}")
                return

            crisis_type = classification.get("crisis_type", "other")
            venue, crisis = await get_venue_and_crisis_details(mongo_db, evidence.venue_id, crisis_type)
            if not crisis: _, crisis = await get_venue_and_crisis_details(mongo_db, evidence.venue_id, "other")

            mongo_insert = await mongo_db.ai_responses.insert_one({
                "venue": ObjectId(evidence.venue_id) if evidence.venue_id else None,
                "crisis": crisis["_id"] if crisis else None,
                "confidence_score": classification.get("confidence_score", 0.0),
                "summary": classification.get("summary", ""),
                "status": "active",
                "zones": [zone],
                "created_at": datetime.now(timezone.utc)
            })

            duration = round(time.time() - start_time, 2)
            output = {
                "venue_id": evidence.venue_id, "zone": zone, "device_id": device_id,
                "source_timestamp": evidence.timestamp, "analysis_completed_at": datetime.now(timezone.utc).isoformat(),
                "analysis_duration": duration, "crisis_detected": True, "crisis_type": crisis_type,
                "confidence_score": classification.get("confidence_score", 0.0),
                "summary": classification.get("summary", ""), "reasoning": classification.get("reasoning", ""),
                "is_hardware_trigger": classification.get("is_hardware_trigger", False),
                "mongo_response_id": str(mongo_insert.inserted_id),
                "trigger_sensors": sensors, "venue_details": format_doc(venue),
                "crisis_details": format_doc(crisis), "status": "active"
            }
            await redis_client.lpush(OUTPUT_QUEUE, json.dumps(output))
            print(f"[AI] SUCCESS: {crisis_type} at {zone} ({duration}s)")
    except Exception as e:
        print(f"[AI ERROR] Task failure: {e}")

# Entry point for the AI worker loop
async def main():
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        await r.ping()
        print(f"Redis connected: {REDIS_URL}")
        
        mongo_client = AsyncIOMotorClient(MONGO_URI)
        db_name = MONGO_URI.rsplit("/", 1)[-1].split("?")[0]
        mongo_db = mongo_client[db_name]
        print(f"MongoDB connected: {db_name}")
    except Exception as e:
        print(f"[AI ERROR] Initialization failed: {e}")
        return

    print(f"Listening on: {INPUT_QUEUE}")
    while True:
        try:
            result = await r.brpop(INPUT_QUEUE, timeout=1)
            if result: asyncio.create_task(process_evidence(result[1], r, mongo_db))
        except asyncio.CancelledError: break
        except Exception as e:
            print(f"[AI ERROR] Loop error: {e}")
            await asyncio.sleep(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProcess terminated.")
